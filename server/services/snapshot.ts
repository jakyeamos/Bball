/**
 * League Snapshot Creation
 *
 * The snapshot is now built around a layered player model:
 * raw stats -> advanced profile -> value model -> legacy feature projection.
 */

import {
  AdvancedProfileSummary,
  buildPlayerAdvancedProfile,
  buildPlayerFeatures,
  buildPlayerModel,
  computeAdvancedProfileAverages,
  computePopulationStats,
  RoleSummary,
  standardizeFeatures,
} from './features';
import {
  LeagueSnapshot,
  Player,
  PlayerAdvancedProfile,
  PlayerFeatures,
  PlayerRawStats,
  RoleCategory,
} from '@nba-draft-sim/shared';
import { computeArchetypeProfile } from './archetypes';
import { v4 as uuidv4 } from 'uuid';
import { inferPlayerRoles } from './roleInference';

const SNAPSHOT_SCHEMA_VERSION = 2;

function average(values: number[]): number {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function meanFeatureSummary(features: PlayerFeatures[]): RoleSummary {
  const summary = {} as RoleSummary;
  const keys: Array<keyof RoleSummary> = [
    'TS',
    'THREE_P_PCT',
    'THREE_PA_RATE',
    'TWO_P_PCT',
    'TWO_PA_RATE',
    'FT_PCT',
    'FT_RATE',
    'EFG',
    'THREE_P_VOLUME',
    'AST',
    'AST_RATE',
    'POTENTIAL_AST',
    'AST_TO_PASS_RATE',
    'SECONDARY_AST',
    'PAR',
    'TOV',
    'TOV_RATE',
    'A2T',
    'STL',
    'BLK',
    'STL_RATE',
    'BLK_RATE',
    'DEFLECTIONS',
    'PF_RATE',
    'CHARGES_DRAWN',
    'OREB_PCT',
    'DREB_PCT',
    'REB_TOTAL',
    'USG',
    'VI',
  ];

  for (const key of keys) {
    summary[key] = average(features.map((feature) => feature[key] ?? 0));
  }

  return summary;
}

function bootstrapFeatureSummary(rawStats: PlayerRawStats[]): RoleSummary {
  const bootstrapFeatures = rawStats.map((stats) => buildPlayerFeatures(stats, {
    TS: stats.TS_PCT,
    THREE_P_PCT: stats.THREE_P_PCT,
    THREE_PA_RATE: stats.THREE_PA / Math.max(1, stats.GP),
    TWO_P_PCT: stats.TWO_P_PCT,
    TWO_PA_RATE: stats.TWO_PA / Math.max(1, stats.GP),
    FT_PCT: stats.FT_PCT,
    FT_RATE: stats.FTA / Math.max(1, stats.FGA),
    EFG: stats.FGA > 0 ? (stats.TWO_PM + 1.5 * stats.THREE_PM) / stats.FGA : 0,
    THREE_P_VOLUME: stats.THREE_PA / Math.max(1, stats.GP),
    AST: stats.AST / Math.max(1, stats.GP),
    AST_RATE: stats.AST_PCT_PROXY ?? 0.22,
    POTENTIAL_AST: (stats.POTENTIAL_AST ?? stats.AST * 1.5) / Math.max(1, stats.GP),
    AST_TO_PASS_RATE: stats.AST / Math.max(1, stats.PASSES_MADE ?? stats.AST * 9),
    SECONDARY_AST: (stats.SECONDARY_AST ?? stats.AST * 0.3) / Math.max(1, stats.GP),
    PAR: stats.AST / Math.max(1, stats.AST + stats.TOV),
    TOV: stats.TOV / Math.max(1, stats.GP),
    TOV_RATE: stats.TOV_PCT_PROXY ?? 0.12,
    A2T: stats.TOV > 0 ? stats.AST / stats.TOV : stats.AST,
    STL: stats.STL / Math.max(1, stats.GP),
    BLK: stats.BLK / Math.max(1, stats.GP),
    STL_RATE: stats.STL / Math.max(1, stats.GP),
    BLK_RATE: stats.BLK / Math.max(1, stats.GP),
    DEFLECTIONS: (stats.DEFLECTIONS ?? stats.STL * 3) / Math.max(1, stats.GP),
    PF_RATE: stats.PF / Math.max(1, stats.GP),
    CHARGES_DRAWN: (stats.CHARGES_DRAWN ?? 0) / Math.max(1, stats.GP),
    OREB_PCT: stats.OREB_PCT ?? 0,
    DREB_PCT: stats.DREB_PCT ?? 0,
    REB_TOTAL: stats.REB / Math.max(1, stats.GP),
    USG: stats.USG_PROXY ?? 0.2,
    VI: 0.5,
  }));

  return meanFeatureSummary(bootstrapFeatures);
}

function calculateRoleAverages(
  players: Array<{
    rawStats: PlayerRawStats;
    features: PlayerFeatures;
    advancedProfile: PlayerAdvancedProfile;
    roleCategory: RoleCategory;
  }>,
): {
  featureRoleAverages: Record<RoleCategory, RoleSummary>;
  advancedRoleAverages: Record<RoleCategory, AdvancedProfileSummary>;
} {
  const groupedFeatures: Record<RoleCategory, PlayerFeatures[]> = {
    G: [],
    W: [],
    B: [],
  };
  const groupedAdvanced: Record<RoleCategory, PlayerAdvancedProfile[]> = {
    G: [],
    W: [],
    B: [],
  };

  for (const player of players) {
    groupedFeatures[player.roleCategory].push(player.features);
    groupedAdvanced[player.roleCategory].push(player.advancedProfile);
  }

  const allFeatures = players.map((player) => player.features);
  const allAdvanced = players.map((player) => player.advancedProfile);
  const fallbackFeature = meanFeatureSummary(allFeatures);
  const fallbackAdvanced = computeAdvancedProfileAverages(allAdvanced);

  const featureRoleAverages = {} as Record<RoleCategory, RoleSummary>;
  const advancedRoleAverages = {} as Record<RoleCategory, AdvancedProfileSummary>;

  (['G', 'W', 'B'] as const).forEach((role) => {
    featureRoleAverages[role] = groupedFeatures[role].length > 0
      ? meanFeatureSummary(groupedFeatures[role])
      : fallbackFeature;
    advancedRoleAverages[role] = groupedAdvanced[role].length > 0
      ? computeAdvancedProfileAverages(groupedAdvanced[role])
      : fallbackAdvanced;
  });

  return { featureRoleAverages, advancedRoleAverages };
}

function processPlayer(
  rawStats: PlayerRawStats,
  advancedRoleSummary: AdvancedProfileSummary,
  featureRoleSummary: RoleSummary,
  populationStats: { mean: Record<string, number>; std: Record<string, number> },
): Player {
  const { advancedProfile, valueModel, features } = buildPlayerModel(
    rawStats,
    advancedRoleSummary,
    featureRoleSummary,
  );
  const zScores = standardizeFeatures(features, populationStats.mean, populationStats.std);
  const archetypes = computeArchetypeProfile(zScores);
  const roles = inferPlayerRoles(rawStats, advancedProfile, features);

  return {
    playerId: rawStats.playerId,
    name: rawStats.name,
    team: rawStats.team,
    position: rawStats.position,
    rosterRole: roles.rosterRole,
    functionalRole: roles.functionalRole,
    rawStats,
    advancedProfile,
    valueModel,
    features,
    archetypes,
    impactRating: valueModel.gameImpact,
  };
}

export async function createLeagueSnapshot(
  rawPlayerStats: PlayerRawStats[],
  season: string,
): Promise<LeagueSnapshot> {
  console.log(`Creating enriched league snapshot for ${rawPlayerStats.length} players...`);

  const bootstrapFeature = bootstrapFeatureSummary(rawPlayerStats);
  const initialProfiles = rawPlayerStats.map((rawStats) => {
    const advancedProfile = buildPlayerAdvancedProfile(rawStats);
    const features = buildPlayerFeatures(rawStats, bootstrapFeature, advancedProfile);
    const roles = inferPlayerRoles(rawStats, advancedProfile, features);
    return { rawStats, advancedProfile, features, roleCategory: roles.roleCategory };
  });

  const populationStats = computePopulationStats(initialProfiles.map((player) => player.features));
  const { featureRoleAverages, advancedRoleAverages } = calculateRoleAverages(initialProfiles);

  const players = rawPlayerStats.map((rawStats) => {
    const initialProfile = initialProfiles.find((player) => player.rawStats.playerId === rawStats.playerId);
    const role = initialProfile?.roleCategory ?? 'W';
    return processPlayer(
      rawStats,
      advancedRoleAverages[role],
      featureRoleAverages[role],
      populationStats,
    );
  });

  console.log(`Snapshot created: ${players.length} enriched players processed`);

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    snapshotId: uuidv4(),
    createdAt: new Date().toISOString(),
    season,
    players,
    populationStats,
    roleAverages: featureRoleAverages,
    advancedRoleAverages,
  };
}
