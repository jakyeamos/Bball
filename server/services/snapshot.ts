/**
 * League Snapshot Creation
 * Processes raw player stats into a complete league snapshot with:
 * - Player features (30 features - Phase 2)
 * - Archetype profiles
 * - Impact ratings
 * - Population statistics
 * - Role averages
 * 
 * UPDATED for Phase 2: All 30 features, REB → REB_TOTAL
 */

import {
  PlayerRawStats,
  Player,
  LeagueSnapshot,
  PlayerFeatures,
  RoleCategory,
  POSITION_TO_ROLE
} from '@nba-draft-sim/shared';
import { buildPlayerFeatures, standardizeFeatures, RoleSummary } from './features';
import { computeArchetypeProfile } from './archetypes';
import { calculateImpactRating } from './aggregation';
import { v4 as uuidv4 } from 'uuid';

/**
 * Calculate population mean for a specific feature
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calculate population standard deviation
 */
function calculateStd(values: number[], mean: number): number {
  if (values.length === 0) return 1;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calculate population statistics for all features (Phase 2: 30 features)
 */
function calculatePopulationStats(features: PlayerFeatures[]): {
  mean: Record<string, number>;
  std: Record<string, number>;
} {
  // Phase 2: All 30 feature names
  const featureNames = [
    // Shooting (9)
    'TS', 'THREE_P_PCT', 'THREE_PA_RATE', 'TWO_P_PCT', 'TWO_PA_RATE',
    'FT_PCT', 'FT_RATE', 'EFG', 'THREE_P_VOLUME',
    // Playmaking (6)
    'AST', 'AST_RATE', 'POTENTIAL_AST', 'AST_TO_PASS_RATE', 'SECONDARY_AST', 'PAR',
    // Ball Security (3)
    'TOV', 'TOV_RATE', 'A2T',
    // Defense (7)
    'STL', 'BLK', 'STL_RATE', 'BLK_RATE', 'DEFLECTIONS', 'PF_RATE', 'CHARGES_DRAWN',
    // Rebounding (3)
    'OREB_PCT', 'DREB_PCT', 'REB_TOTAL',
    // Usage (2)
    'USG', 'VI'
  ];

  const mean: Record<string, number> = {};
  const std: Record<string, number> = {};

  for (const feature of featureNames) {
    const values = features
      .map(f => (f as any)[feature] as number | undefined)
      .filter((v): v is number => v !== undefined);
    
    const meanVal = calculateMean(values);
    mean[feature] = meanVal;
    std[feature] = calculateStd(values, meanVal);
  }

  return { mean, std };
}

/**
 * Calculate role averages (G, W, B) for shrinkage (Phase 2: 30 features)
 */
function calculateRoleAverages(
  players: Array<{ rawStats: PlayerRawStats; features: PlayerFeatures }>
): Record<RoleCategory, RoleSummary> {
  const roleGroups: Record<RoleCategory, PlayerFeatures[]> = {
    G: [],
    W: [],
    B: [],
  };

  // Group players by role
  for (const player of players) {
    const role = POSITION_TO_ROLE[player.rawStats.position] || 'W';
    roleGroups[role].push(player.features);
  }

  // Calculate averages for each role
  const roleAverages: Record<string, RoleSummary> = {};

  for (const [role, features] of Object.entries(roleGroups)) {
    if (features.length === 0) {
      // If no players in role, use overall population average
      features.push(...Object.values(roleGroups).flat());
    }

    // Phase 2: RoleSummary with 30 fields (no avg_ prefix)
    roleAverages[role] = {
      // Shooting (9)
      TS: calculateMean(features.map(f => f.TS ?? 0)),
      THREE_P_PCT: calculateMean(features.map(f => f.THREE_P_PCT ?? 0)),
      THREE_PA_RATE: calculateMean(features.map(f => f.THREE_PA_RATE ?? 0)),
      TWO_P_PCT: calculateMean(features.map(f => f.TWO_P_PCT ?? 0)),
      TWO_PA_RATE: calculateMean(features.map(f => f.TWO_PA_RATE ?? 0)),
      FT_PCT: calculateMean(features.map(f => f.FT_PCT ?? 0)),
      FT_RATE: calculateMean(features.map(f => f.FT_RATE ?? 0)),
      EFG: calculateMean(features.map(f => f.EFG ?? 0)),
      THREE_P_VOLUME: calculateMean(features.map(f => f.THREE_P_VOLUME ?? 0)),
      
      // Playmaking (6)
      AST: calculateMean(features.map(f => f.AST ?? 0)),
      AST_RATE: calculateMean(features.map(f => f.AST_RATE ?? 0)),
      POTENTIAL_AST: calculateMean(features.map(f => f.POTENTIAL_AST ?? 0)),
      AST_TO_PASS_RATE: calculateMean(features.map(f => f.AST_TO_PASS_RATE ?? 0)),
      SECONDARY_AST: calculateMean(features.map(f => f.SECONDARY_AST ?? 0)),
      PAR: calculateMean(features.map(f => f.PAR ?? 0)),
      
      // Ball Security (3)
      TOV: calculateMean(features.map(f => f.TOV ?? 0)),
      TOV_RATE: calculateMean(features.map(f => f.TOV_RATE ?? 0)),
      A2T: calculateMean(features.map(f => f.A2T ?? 0)),
      
      // Defense (7)
      STL: calculateMean(features.map(f => f.STL ?? 0)),
      BLK: calculateMean(features.map(f => f.BLK ?? 0)),
      STL_RATE: calculateMean(features.map(f => f.STL_RATE ?? 0)),
      BLK_RATE: calculateMean(features.map(f => f.BLK_RATE ?? 0)),
      DEFLECTIONS: calculateMean(features.map(f => f.DEFLECTIONS ?? 0)),
      PF_RATE: calculateMean(features.map(f => f.PF_RATE ?? 0)),
      CHARGES_DRAWN: calculateMean(features.map(f => f.CHARGES_DRAWN ?? 0)),
      
      // Rebounding (3)
      OREB_PCT: calculateMean(features.map(f => f.OREB_PCT ?? 0)),
      DREB_PCT: calculateMean(features.map(f => f.DREB_PCT ?? 0)),
      REB_TOTAL: calculateMean(features.map(f => f.REB_TOTAL ?? 0)),
      
      // Usage (2)
      USG: calculateMean(features.map(f => f.USG ?? 0)),
      VI: calculateMean(features.map(f => f.VI ?? 0)),
    };
  }

  return roleAverages as Record<RoleCategory, RoleSummary>;
}

/**
 * Process a single player through the full pipeline
 */
function processPlayer(
  rawStats: PlayerRawStats,
  roleSummary: RoleSummary,
  populationStats: { mean: Record<string, number>; std: Record<string, number> }
): Player {
  // Step 1: Build features with reliability shrinkage
  const features = buildPlayerFeatures(rawStats, roleSummary);

  // Step 2: Calculate impact rating
  const impactRating = calculateImpactRating(features);

  // Step 3: Standardize features (z-scores)
  const zScores = standardizeFeatures(features, populationStats.mean, populationStats.std);

  // Step 4: Compute archetype profile
  const archetypes = computeArchetypeProfile(zScores);

  return {
    playerId: rawStats.playerId,
    name: rawStats.name,
    team: rawStats.team,
    position: rawStats.position,
    rawStats,
    features,
    archetypes,
    impactRating,
  };
}

/**
 * Create a complete league snapshot from raw player stats
 * This is a two-pass process:
 * 1. Calculate population stats and role averages
 * 2. Process all players with these statistics
 */
export async function createLeagueSnapshot(
  rawPlayerStats: PlayerRawStats[],
  season: string
): Promise<LeagueSnapshot> {
  console.log(`Creating league snapshot for ${rawPlayerStats.length} players...`);

  // First pass: Calculate initial features (without full population stats)
  // We need to bootstrap the process
  const initialRoleAverages = bootstrapRoleAverages(rawPlayerStats);

  const initialFeatures = rawPlayerStats.map(stats => {
    const role = POSITION_TO_ROLE[stats.position] || 'W';
    return {
      rawStats: stats,
      features: buildPlayerFeatures(stats, initialRoleAverages[role]),
    };
  });

  // Calculate population statistics
  const populationStats = calculatePopulationStats(initialFeatures.map(p => p.features));

  // Calculate role averages
  const roleAverages = calculateRoleAverages(initialFeatures);

  // Second pass: Process all players with correct statistics
  const players = rawPlayerStats.map(stats => {
    const role = POSITION_TO_ROLE[stats.position] || 'W';
    return processPlayer(stats, roleAverages[role], populationStats);
  });

  console.log(`Snapshot created: ${players.length} players processed`);

  return {
    snapshotId: uuidv4(),
    createdAt: new Date().toISOString(),
    season,
    players,
    populationStats,
    roleAverages,
  };
}

/**
 * Bootstrap initial role averages (use league-wide averages initially)
 * Phase 2: Calculate all 30 features
 */
function bootstrapRoleAverages(rawStats: PlayerRawStats[]): Record<RoleCategory, RoleSummary> {
  // Calculate simple averages across all players for bootstrapping
  const allTS = rawStats.map(s => s.TS_PCT);
  const allThreePct = rawStats.map(s => s.THREE_P_PCT);
  const allThreeRate = rawStats.map(s => s.THREE_PA / Math.max(1, s.FGA));
  const allTwoPct = rawStats.map(s => s.TWO_P_PCT);
  const allTwoRate = rawStats.map(s => s.TWO_PA / Math.max(1, s.FGA));
  const allFTPct = rawStats.map(s => s.FT_PCT);
  const allFTRate = rawStats.map(s => s.FTA / Math.max(1, s.FGA));
  const allEFG = rawStats.map(s => (s.FGA > 0 ? (s.FGA - s.THREE_PA + 1.5 * s.THREE_PA) / s.FGA : 0));
  const allThreeVol = rawStats.map(s => s.THREE_PA / Math.max(1, s.MP_TOTAL / 36));
  
  const allAST = rawStats.map(s => s.AST);
  const allTOV = rawStats.map(s => s.TOV);
  const allBLK = rawStats.map(s => s.BLK);
  const allSTL = rawStats.map(s => s.STL);
  const allREB = rawStats.map(s => s.ORB + s.DRB);
  const allOREB = rawStats.map(s => s.OREB_PCT || 0);
  const allDREB = rawStats.map(s => s.DREB_PCT || 0);
  
  const allUSG = rawStats.map(s =>
    (s.FGA + 0.44 * s.FTA + s.TOV) / Math.max(1, s.MP_TOTAL)
  );

  const bootstrap: RoleSummary = {
    // Shooting (9)
    TS: calculateMean(allTS),
    THREE_P_PCT: calculateMean(allThreePct),
    THREE_PA_RATE: calculateMean(allThreeRate),
    TWO_P_PCT: calculateMean(allTwoPct),
    TWO_PA_RATE: calculateMean(allTwoRate),
    FT_PCT: calculateMean(allFTPct),
    FT_RATE: calculateMean(allFTRate),
    EFG: calculateMean(allEFG),
    THREE_P_VOLUME: calculateMean(allThreeVol),
    
    // Playmaking (6) - Use reasonable defaults for unavailable stats
    AST: calculateMean(allAST),
    AST_RATE: 0,  // Will be calculated properly in buildPlayerFeatures
    POTENTIAL_AST: 0,
    AST_TO_PASS_RATE: 0,
    SECONDARY_AST: 0,
    PAR: 0.6,  // Reasonable default
    
    // Ball Security (3)
    TOV: calculateMean(allTOV),
    TOV_RATE: 0,
    A2T: 0,
    
    // Defense (7)
    STL: calculateMean(allSTL),
    BLK: calculateMean(allBLK),
    STL_RATE: 0,
    BLK_RATE: 0,
    DEFLECTIONS: 0,
    PF_RATE: 0,
    CHARGES_DRAWN: 0,
    
    // Rebounding (3)
    OREB_PCT: calculateMean(allOREB),
    DREB_PCT: calculateMean(allDREB),
    REB_TOTAL: calculateMean(allREB),
    
    // Usage (2)
    USG: calculateMean(allUSG),
    VI: 0.5,  // Reasonable default
  };

  // Use same bootstrap for all roles initially
  return {
    G: bootstrap,
    W: bootstrap,
    B: bootstrap,
  };
}

/**
 * Get a player from snapshot by ID
 */
export function getPlayerById(snapshot: LeagueSnapshot, playerId: string): Player | undefined {
  return snapshot.players.find(p => p.playerId === playerId);
}

/**
 * Get multiple players from snapshot
 */
export function getPlayersByIds(snapshot: LeagueSnapshot, playerIds: string[]): Player[] {
  const playerMap = new Map(snapshot.players.map(p => [p.playerId, p]));
  return playerIds
    .map(id => playerMap.get(id))
    .filter((p): p is Player => p !== undefined);
}