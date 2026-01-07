/**
 * Impact Rating and Team Aggregation
 */

import {
  TeamAggregation,
  Player,
  PlayerFeatures,
} from '@nba-draft-sim/shared';

import { IMPACT_WEIGHTS, ROTATION_SIZE } from '@nba-draft-sim/shared';
import { safeDivide } from '../utils/utils';
import { aggregateArchetypeProfiles } from './archetypes';

function scaleTS(ts: number): number {
  // TS is ~0.45..0.70 — center it a bit
  return (ts - 0.56) * 100;
}

export function calculateImpactRating(f: PlayerFeatures): number {
  const w = IMPACT_WEIGHTS as any;

  const par = (f as any).PAR ?? safeDivide(f.AST, f.AST + f.TOV);
  const vi = (f as any).VI ?? 0.5;

  // Use TS in a better scale
  const tsScaled = scaleTS(f.TS);

  return (
    w.TS * tsScaled +
    w.AST * f.AST +
    w.PAR * par * 100 +
    w.THREE_PA_RATE * f.THREE_PA_RATE * 100 +
    w.FT_RATE * f.FT_RATE * 100 +
    w.USG * f.USG * 100 +
    w.STL * f.STL +
    w.BLK * f.BLK +
    w.REB * f.REB +
    w.VI * vi * 100 +
    w.TOV * f.TOV
  );
}

function normalizeWeights(vals: number[]): number[] {
  const shifted = vals.map(v => Math.max(0.0001, v - Math.min(...vals) + 0.0001));
  const sum = shifted.reduce((a, b) => a + b, 0);
  return shifted.map(v => v / (sum || 1));
}

function weightedAvg(values: number[], weights: number[]): number {
  return values.reduce((acc, v, i) => acc + v * weights[i], 0);
}

export function aggregateTeam(players: Player[], teamId: string): TeamAggregation {
  // compute impact for each player (should already be computed elsewhere; safe here)
  const rated = players.map(p => ({
    ...p,
    impactRating: p.impactRating ?? calculateImpactRating(p.features),
  }));

  // Top rotation
  const rotation = [...rated]
    .sort((a, b) => b.impactRating - a.impactRating)
    .slice(0, ROTATION_SIZE);

  const weights = normalizeWeights(rotation.map(p => p.impactRating));

  const feat = (k: string) => weightedAvg(rotation.map(p => (p.features as any)[k] ?? 0), weights);

  const teamFeatures = {
    TS: feat('TS'),
    AST: feat('AST'),
    TOV: feat('TOV'),
    A2T: feat('A2T'),
    THREE_PA_RATE: feat('THREE_PA_RATE'),
    FT_RATE: feat('FT_RATE'),
    BLK: feat('BLK'),
    STL: feat('STL'),
    REB: feat('REB'),
    USG: feat('USG'),
    PAR: feat('PAR'),
    VI: feat('VI'),
  };

  const archetypes = aggregateArchetypeProfiles(
    rotation.map(p => p.archetypes),
    weights
  );

  return {
    teamId,
    features: teamFeatures as any,
    archetypes,
    rotationPlayerIds: rotation.map(p => p.playerId),
  };
}
