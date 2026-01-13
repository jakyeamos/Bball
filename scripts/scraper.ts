/**
 * NBA Stats Scraper
 * Fetches player stats using nba_api Python library via child process
 * Falls back to sample data if scraping fails
 * 
 * UPDATED for Phase 2: Added missing fields (FTM, THREE_PM, TWO_PA, TWO_PM, TWO_P_PCT)
 */
import { PlayerRawStats } from '@nba-draft-sim/shared';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

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

/**
 * Convert NBA API data to PlayerRawStats format
 */
function convertToRawStats(data: NBAPlayerData): PlayerRawStats {
  const fgPct = data.FGA > 0 ? data.FGM / data.FGA : 0;
  const ftPct = data.FTA > 0 ? data.FTM / data.FTA : 0;
  const threePct = data.THREE_PA > 0 ? data.THREE_PM / data.THREE_PA : 0;
  
  // ✅ PHASE 2: Calculate two-point stats
  const twoPA = data.FGA - data.THREE_PA;
  const twoPM = data.FGM - data.THREE_PM;
  const twoPct = twoPA > 0 ? twoPM / twoPA : 0;

  // Calculate True Shooting %: PTS / (2 * (FGA + 0.44 * FTA))
  const tsPct = data.FGA + 0.44 * data.FTA > 0
    ? data.PTS / (2 * (data.FGA + 0.44 * data.FTA))
    : 0;

  return {
    playerId: data.playerId,
    name: data.name,
    team: data.team,
    position: data.position || 'G', // Default to guard if missing
    
    // Displayed stats
    PTS: data.PTS,
    REB: data.REB,
    AST: data.AST,
    STL: data.STL,
    BLK: data.BLK,
    TS_PCT: tsPct,
    
    // Core stats
    MP_TOTAL: data.MIN,
    GP: data.GP,
    FGA: data.FGA,
    FTA: data.FTA,
    FTM: data.FTM,           // ✅ PHASE 2: Added
    TOV: data.TOV,
    THREE_PA: data.THREE_PA,
    THREE_PM: data.THREE_PM, // ✅ PHASE 2: Added
    THREE_P_PCT: threePct,
    FT_PCT: ftPct,
    ORB: data.ORB,
    DRB: data.DRB,
    PF: data.PF,
    
    // ✅ PHASE 2: Two-point stats (calculated)
    TWO_PA: twoPA,
    TWO_PM: twoPM,
    TWO_P_PCT: twoPct,
    
    // Optional advanced stats (not available from basic scraper)
    POTENTIAL_AST: undefined,
    SECONDARY_AST: undefined,
    PASSES_MADE: undefined,
    PASSES_RECEIVED: undefined,
    DEFLECTIONS: undefined,
    CHARGES_DRAWN: undefined,
    CONTESTED_SHOTS: undefined,
    POSSESSIONS: undefined,
    TOUCHES: undefined,
    SCREEN_ASSISTS: undefined,
    USG_PROXY: undefined,
    AST_PCT_PROXY: undefined,
    TOV_PCT_PROXY: undefined,
    OREB_PCT: undefined,
    DREB_PCT: undefined,
    REB_PCT: undefined,
  };
}

/**
 * Scrape current season stats using nba_api Python script
 */
export async function scrapeNBAStats(season: string = '2025-26'): Promise<PlayerRawStats[]> {
  try {
    const pythonScriptPath = path.join(__dirname, '../../scripts/scrape_nba_stats.py');
    
    // Check if Python script exists
    try {
      await fs.access(pythonScriptPath);
    } catch {
      console.warn('Python scraper not found, using fallback data');
      return loadFallbackData();
    }

    // Execute Python script
    const { stdout } = await execAsync(`python3 ${pythonScriptPath} --season ${season}`);
    const data: NBAPlayerData[] = JSON.parse(stdout);
    
    console.log(`Scraped ${data.length} players for season ${season}`);
    return data.map(convertToRawStats);
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
  const fallbackPath = path.join(__dirname, '../../../data/sample_players.json');
  
  try {
    const data = await fs.readFile(fallbackPath, 'utf-8');
    const players: NBAPlayerData[] = JSON.parse(data);
    console.log(`Loaded ${players.length} players from fallback data`);
    return players.map(convertToRawStats);
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