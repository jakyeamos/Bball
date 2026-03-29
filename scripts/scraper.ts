/**
 * NBA Stats Scraper
 * Offline player data helpers.
 * Runtime reads versioned disk artifacts; operator workflows can still invoke
 * the Python scraper out of band to regenerate those artifacts.
 */

import type { PlayerRawStats, NbaScraperSeasonStatsRow } from '@nba-draft-sim/shared';
import { nbaSeasonJsonRowToPlayerRawStats } from '../server/services/playerFeaturesMapping';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);
const PLAYER_STATS_ARTIFACT_SCHEMA_VERSION = 2;

interface PlayerStatsArtifact {
  schemaVersion: number;
  season: string;
  generatedAt: string;
  source: 'batch_v2';
  players: NbaScraperSeasonStatsRow[];
}

function serverPackageRoot(): string {
  return __dirname.includes(`${path.sep}dist${path.sep}scripts`)
    ? path.join(__dirname, '..', '..')
    : path.join(__dirname, '..', 'server');
}

export interface NBAPlayerData {
  playerId: string;
  name: string;
  team: string;
  position: string;
  GP: number;
  MIN: number;
  PTS: number;
  REB: number;
  AST: number;
  STL: number;
  BLK: number;
  FGA: number;
  FGM: number;
  FTA: number;
  FTM: number;
  THREE_PA: number;
  THREE_PM: number;
  TOV: number;
  ORB: number;
  DRB: number;
  PF: number;
}

/** sample_players.json shape → mapping-ready row (mirrors Python-derived fields). */
function legacyNbaPlayerDataToSeasonRow(d: NBAPlayerData): NbaScraperSeasonStatsRow {
  const twoPA = d.FGA - d.THREE_PA;
  const twoPM = d.FGM - d.THREE_PM;
  const twoPct = twoPA > 0 ? twoPM / twoPA : 0;
  const threePct = d.THREE_PA > 0 ? d.THREE_PM / d.THREE_PA : 0;
  const ftPct = d.FTA > 0 ? d.FTM / d.FTA : 0;
  const tsDenom = d.FGA + 0.44 * d.FTA;
  const tsPct = tsDenom > 0 ? d.PTS / (2 * tsDenom) : 0;
  const possEst = Math.max(1, 0.96 * (d.FGA + 0.44 * d.FTA + d.TOV - d.ORB));

  return {
    playerId: d.playerId,
    name: d.name,
    team: d.team,
    position: d.position || 'PG',
    GP: d.GP,
    MIN: d.MIN,
    PTS: d.PTS,
    REB: d.REB,
    AST: d.AST,
    STL: d.STL,
    BLK: d.BLK,
    FGA: d.FGA,
    FGM: d.FGM,
    FTA: d.FTA,
    FTM: d.FTM,
    THREE_PA: d.THREE_PA,
    THREE_PM: d.THREE_PM,
    TOV: d.TOV,
    ORB: d.ORB,
    DRB: d.DRB,
    PF: d.PF,
    TWO_PA: twoPA,
    TWO_PM: twoPM,
    TWO_P_PCT: twoPct,
    THREE_P_PCT: threePct,
    FT_PCT: ftPct,
    TS_PCT: tsPct,
    POSS_EST: possEst,
  };
}

/**
 * Operator helper: scrape current season stats using the Python batch script.
 */
export async function scrapeNBAStats(season: string = '2025-26'): Promise<PlayerRawStats[]> {
  try {
    const pkgRoot = serverPackageRoot();
    const pythonScriptPath = path.join(pkgRoot, 'scripts', 'scrape_nba_stats.py');

    try {
      await fs.access(pythonScriptPath);
    } catch {
      console.warn('Python scraper not found, using fallback data');
      return loadFallbackData();
    }

    const { stdout } = await execAsync(`python3 ${pythonScriptPath} --season ${season}`);
    const parsed = JSON.parse(stdout) as PlayerStatsArtifact | NbaScraperSeasonStatsRow[];
    const data = Array.isArray(parsed) ? parsed : parsed.players;

    console.log(`Scraped ${data.length} players for season ${season}`);
    return data.map((row) => nbaSeasonJsonRowToPlayerRawStats(row));
  } catch (error) {
    console.error('Error scraping NBA stats:', error);
    console.warn('Falling back to sample data');
    return loadFallbackData();
  }
}

function artifactPath(season: string): string {
  return path.join(serverPackageRoot(), 'data', `player-stats-${season}.json`);
}

function isValidArtifact(raw: unknown, season: string): raw is PlayerStatsArtifact {
  if (typeof raw !== 'object' || raw === null) return false;
  const artifact = raw as Partial<PlayerStatsArtifact>;
  return (
    artifact.schemaVersion === PLAYER_STATS_ARTIFACT_SCHEMA_VERSION &&
    artifact.season === season &&
    artifact.source === 'batch_v2' &&
    Array.isArray(artifact.players)
  );
}

async function loadBatchArtifact(season: string): Promise<PlayerRawStats[]> {
  const file = artifactPath(season);
  const raw = JSON.parse(await fs.readFile(file, 'utf-8')) as unknown;

  if (!isValidArtifact(raw, season)) {
    throw new Error(`Invalid or stale player stats artifact: ${file}`);
  }

  return raw.players.map((row) => nbaSeasonJsonRowToPlayerRawStats(row));
}

/**
 * Load fallback sample data (for development/testing)
 */
async function loadFallbackData(): Promise<PlayerRawStats[]> {
  const fallbackPath = path.join(serverPackageRoot(), '..', 'data', 'sample_players.json');

  try {
    const raw = await fs.readFile(fallbackPath, 'utf-8');
    const players: NBAPlayerData[] = JSON.parse(raw);
    console.log(`Loaded ${players.length} players from fallback data`);
    return players.map((p) =>
      nbaSeasonJsonRowToPlayerRawStats(legacyNbaPlayerDataToSeasonRow(p)),
    );
  } catch (error) {
    console.error('Error loading fallback data:', error);
    throw new Error('Failed to load player data');
  }
}

/**
 * Filter players by minimum games and minutes played
 */
export function filterPlayers(
  players: PlayerRawStats[],
  minGames: number = 10,
  minMinutes: number = 100
): PlayerRawStats[] {
  return players.filter(p => p.GP >= minGames && p.MP_TOTAL >= minMinutes);
}

/**
 * Scrape and filter players in one call
 */
export async function fetchPlayerData(
  season: string = '2025-26',
  minGames: number = 10,
  minMinutes: number = 100
): Promise<PlayerRawStats[]> {
  let allPlayers: PlayerRawStats[];
  try {
    allPlayers = await loadBatchArtifact(season);
  } catch (error) {
    console.warn(`[player-data] failed to load batch artifact for ${season}:`, error);
    console.warn('[player-data] using local sample data fallback');
    allPlayers = await loadFallbackData();
  }
  return filterPlayers(allPlayers, minGames, minMinutes);
}
