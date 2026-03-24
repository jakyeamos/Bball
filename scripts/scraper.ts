/**
 * NBA Stats Scraper
 * Fetches player stats using nba_api Python library via child process
 * Falls back to sample data if scraping fails
 */

import type { PlayerRawStats, NbaScraperSeasonStatsRow } from '@nba-draft-sim/shared';
import { nbaSeasonJsonRowToPlayerRawStats } from '../server/services/playerFeaturesMapping';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

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
 * Scrape current season stats using nba_api Python script
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
    const data = JSON.parse(stdout) as NbaScraperSeasonStatsRow[];

    console.log(`Scraped ${data.length} players for season ${season}`);
    return data.map((row) => nbaSeasonJsonRowToPlayerRawStats(row));
  } catch (error) {
    console.error('Error scraping NBA stats:', error);
    console.warn('Falling back to sample data');
    return loadFallbackData();
  }
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
  const allPlayers = await scrapeNBAStats(season);
  return filterPlayers(allPlayers, minGames, minMinutes);
}
