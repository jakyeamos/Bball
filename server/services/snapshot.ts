/**
 * League Snapshot Creation
 * Processes raw player stats into a complete league snapshot with:
 * - Player features
 * - Archetype profiles
 * - Impact ratings
 * - Population statistics
 * - Role averages
 */

import {
  PlayerRawStats,
  Player,
  LeagueSnapshot,
  PlayerFeatures,
  RoleSummary,
  RoleCategory,
  POSITION_TO_ROLE
} from '@nba-draft-sim/shared';
import { buildPlayerFeatures, standardizeFeatures } from './features';
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
 * Calculate population statistics for all features
 */
function calculatePopulationStats(features: PlayerFeatures[]): {
  mean: Record<string, number>;
  std: Record<string, number>;
} {
  const featureNames = ['TS', 'AST', 'TOV', 'A2T', 'THREE_PA_RATE', 'FT_RATE', 'BLK', 'STL', 'REB', 'USG'];

  const mean: Record<string, number> = {};
  const std: Record<string, number> = {};

  for (const feature of featureNames) {
    const values = features.map(f => (f as any)[feature] as number);
    const meanVal = calculateMean(values);
    mean[feature] = meanVal;
    std[feature] = calculateStd(values, meanVal);
  }

  return { mean, std };
}

/**
 * Calculate role averages (G, W, B) for shrinkage
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

    roleAverages[role] = {
      avg_TS: calculateMean(features.map(f => f.TS)),
      avg_AST: calculateMean(features.map(f => f.AST)),
      avg_TOV: calculateMean(features.map(f => f.TOV)),
      avg_3PA_rate: calculateMean(features.map(f => f.THREE_PA_RATE)),
      avg_FT_rate: calculateMean(features.map(f => f.FT_RATE)),
      avg_BLK: calculateMean(features.map(f => f.BLK)),
      avg_STL: calculateMean(features.map(f => f.STL)),
      avg_REB: calculateMean(features.map(f => f.REB)),
      avg_usage_proxy: calculateMean(features.map(f => f.USG)),
      avg_PAR: calculateMean(features.map(f => f.PAR || 0)),  // ← ADD
      avg_VI: calculateMean(features.map(f => f.VI || 0)),
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
 */
function bootstrapRoleAverages(rawStats: PlayerRawStats[]): Record<RoleCategory, RoleSummary> {
  // Calculate simple averages across all players for bootstrapping
  const allTS = rawStats.map(s => s.TS_PCT);
  const allAST = rawStats.map(s => s.AST);
  const allTOV = rawStats.map(s => s.TOV);
  const all3PARate = rawStats.map(s => s.THREE_PA / Math.max(1, s.FGA));
  const allFTRate = rawStats.map(s => s.FTA / Math.max(1, s.FGA));
  const allBLK = rawStats.map(s => s.BLK);
  const allSTL = rawStats.map(s => s.STL);
  const allREB = rawStats.map(s => s.REB);
  const allUSG = rawStats.map(s =>
    (s.FGA + 0.44 * s.FTA + s.TOV) / Math.max(1, s.MP_TOTAL)
  );

  const bootstrap: RoleSummary = {
    avg_TS: calculateMean(allTS),
    avg_AST: calculateMean(allAST),
    avg_TOV: calculateMean(allTOV),
    avg_3PA_rate: calculateMean(all3PARate),
    avg_FT_rate: calculateMean(allFTRate),
    avg_BLK: calculateMean(allBLK),
    avg_STL: calculateMean(allSTL),
    avg_REB: calculateMean(allREB),
    avg_usage_proxy: calculateMean(allUSG),
    avg_PAR: 0.6,   // ← ADD
    avg_VI: 0.5,
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
