import { describe, expect, it } from 'vitest';
import type {
  ArchetypeProfile,
  FitVectors,
  LeagueState,
  Player,
  PlayerAdvancedProfile,
  PlayerFeatures,
  PlayerRawStats,
  PlayerValueModel,
} from '@nba-draft-sim/shared';
import { validateTradeProposal } from '../../managers/tradeProposalManager';

function defaultRawStats(playerId: string): PlayerRawStats {
  return {
    playerId,
    name: playerId,
    team: 'TST',
    position: 'SF',
    PTS: 0,
    REB: 0,
    AST: 0,
    STL: 0,
    BLK: 0,
    TS_PCT: 0.55,
    MP_TOTAL: 1200,
    GP: 60,
    FGA: 0,
    FTA: 0,
    FTM: 0,
    TOV: 0,
    THREE_PA: 0,
    THREE_PM: 0,
    THREE_P_PCT: 0.35,
    FT_PCT: 0.75,
    ORB: 0,
    DRB: 0,
    PF: 0,
    TWO_PA: 0,
    TWO_PM: 0,
    TWO_P_PCT: 0.50,
  };
}

function defaultAdvancedProfile(): PlayerAdvancedProfile {
  return {
    reliability: 0.8,
    minutesLoad: 0.65,
    durability: 0.7,
    shotCreation: 0.5,
    rimPressure: 0.5,
    finishing: 0.5,
    shootingGravity: 0.5,
    spacing: 0.5,
    freeThrowPressure: 0.5,
    playmaking: 0.5,
    secondaryCreation: 0.5,
    turnoverResistance: 0.5,
    offensiveRebounding: 0.5,
    defensiveRebounding: 0.5,
    perimeterDefense: 0.5,
    rimDeterrence: 0.5,
    transitionOffense: 0.5,
    transitionDefense: 0.5,
    foulDiscipline: 0.5,
    switchability: 0.5,
    onBallUsage: 0.5,
    offBallValue: 0.5,
    volatility: 0.4,
  };
}

function defaultFeatures(): PlayerFeatures {
  return {
    R: 0.8,
    TS: 0.56,
    THREE_P_PCT: 0.35,
    THREE_PA_RATE: 5,
    TWO_P_PCT: 0.51,
    TWO_PA_RATE: 8,
    FT_PCT: 0.76,
    FT_RATE: 0.22,
    EFG: 0.53,
    THREE_P_VOLUME: 5,
    AST: 3,
    AST_RATE: 18,
    POTENTIAL_AST: 5,
    AST_TO_PASS_RATE: 0.11,
    SECONDARY_AST: 1.2,
    PAR: 0.62,
    TOV: 2.1,
    TOV_RATE: 12,
    A2T: 1.7,
    STL: 1.0,
    BLK: 0.5,
    STL_RATE: 1.4,
    BLK_RATE: 0.8,
    DEFLECTIONS: 2.0,
    PF_RATE: 2.4,
    CHARGES_DRAWN: 0.1,
    OREB_PCT: 4.0,
    DREB_PCT: 12.0,
    REB_TOTAL: 5.5,
    USG: 0.22,
    VI: 0.5,
  };
}

function defaultArchetypes(): ArchetypeProfile {
  return {
    PrimaryCreator: 0,
    SecondaryPlaymaker: 0,
    VolumeSniper: 0,
    EfficientSpacer: 0,
    ShotMaker: 0,
    AdvantageDriver: 0,
    Connector: 0,
    PointOfAttackMenace: 0,
    Disruptor: 0,
    RimDeterrent: 0,
    ReboundEnforcer: 0,
    HustleEngine: 0,
    WinDriver: 0,
  };
}

function makeValueModel(tradeValue: number, fitVectors: FitVectors): PlayerValueModel {
  return {
    draftValue: tradeValue,
    gameImpact: tradeValue,
    tradeValue,
    fitVectors,
    minutesTier: 'starter',
    varianceProfile: 'balanced',
  };
}

function makePlayer(
  playerId: string,
  tradeValue: number,
  fitVectors: FitVectors,
  overrides: Partial<Pick<Player, 'position' | 'rosterRole' | 'functionalRole'>> = {},
): Player {
  return {
    playerId,
    name: playerId,
    team: 'TST',
    position: overrides.position ?? 'SF',
    rosterRole: overrides.rosterRole ?? 'wing',
    functionalRole: overrides.functionalRole ?? 'two_way_wing',
    rawStats: { ...defaultRawStats(playerId), position: overrides.position ?? 'SF' },
    advancedProfile: defaultAdvancedProfile(),
    valueModel: makeValueModel(tradeValue, fitVectors),
    features: defaultFeatures(),
    archetypes: defaultArchetypes(),
    impactRating: tradeValue,
  };
}

function makeLeagueState(teamARoster: string[], teamBRoster: string[]): LeagueState {
  return {
    leagueId: 'league-1',
    phase: 'trade_window',
    draftState: {
      draftId: 'draft-1',
      status: 'completed',
      config: {
        teamCount: 2,
        rosterSize: 12,
        pickTimer: 60,
        seasonFormat: 'quick_sim',
      },
      teams: [
        {
          teamId: 'A',
          userId: 'user-a',
          displayName: 'Team A',
          roster: teamARoster,
          queue: [],
        },
        {
          teamId: 'B',
          userId: 'user-b',
          displayName: 'Team B',
          roster: teamBRoster,
          queue: [],
        },
      ],
      draftOrder: [],
      picks: [],
      currentPickIndex: 0,
      timeRemaining: null,
      pausedBy: null,
      availablePlayers: [],
      leagueSnapshotId: 'snapshot-1',
    },
    currentRound: null,
    roundState: null,
    totalRounds: null,
    regularSeasonResults: null,
    playoffResults: null,
    tradeProposals: [],
    tradeWindowEndsAt: null,
    coachingHistory: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('tradeProposalManager', () => {
  it('rejects proposals that crater the proposer value profile', () => {
    const players = [
      makePlayer('a-star', 95, {
        creation: 0.90,
        spacing: 0.72,
        rimPressure: 0.80,
        perimeterDefense: 0.62,
        rimDefense: 0.40,
      rebounding: 0.48,
      transition: 0.66,
      ballSecurity: 0.82,
      }, { position: 'SG', rosterRole: 'backcourt', functionalRole: 'primary_creator' }),
      makePlayer('a-wing', 74, {
        creation: 0.32,
        spacing: 0.84,
        rimPressure: 0.38,
        perimeterDefense: 0.70,
        rimDefense: 0.20,
        rebounding: 0.36,
        transition: 0.54,
        ballSecurity: 0.66,
      }, { position: 'SF', rosterRole: 'wing', functionalRole: 'two_way_wing' }),
      makePlayer('b-role-1', 58, {
        creation: 0.20,
        spacing: 0.55,
        rimPressure: 0.34,
        perimeterDefense: 0.48,
        rimDefense: 0.28,
        rebounding: 0.40,
        transition: 0.44,
        ballSecurity: 0.54,
      }, { position: 'PF', rosterRole: 'frontcourt', functionalRole: 'rim_big' }),
      makePlayer('b-role-2', 60, {
        creation: 0.26,
        spacing: 0.48,
        rimPressure: 0.36,
        perimeterDefense: 0.50,
        rimDefense: 0.32,
        rebounding: 0.42,
        transition: 0.45,
        ballSecurity: 0.58,
      }, { position: 'C', rosterRole: 'frontcourt', functionalRole: 'rim_big' }),
    ];

    const league = makeLeagueState(['a-star', 'a-wing'], ['b-role-1', 'b-role-2']);

    const result = validateTradeProposal(
      league,
      'A',
      'B',
      ['a-star'],
      ['b-role-1'],
      players,
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain('proposer');
  });

  it('accepts a near-even trade when both teams improve role balance', () => {
    const players = [
      makePlayer('a-lead-creator', 88, {
        creation: 0.95,
        spacing: 0.35,
        rimPressure: 0.75,
        perimeterDefense: 0.35,
        rimDefense: 0.20,
        rebounding: 0.30,
        transition: 0.55,
        ballSecurity: 0.70,
      }),
      makePlayer('a-secondary-creator', 80, {
        creation: 0.88,
        spacing: 0.30,
        rimPressure: 0.68,
        perimeterDefense: 0.40,
        rimDefense: 0.15,
        rebounding: 0.35,
        transition: 0.60,
        ballSecurity: 0.68,
      }),
      makePlayer('a-shooter', 75, {
        creation: 0.22,
        spacing: 0.90,
        rimPressure: 0.35,
        perimeterDefense: 0.55,
        rimDefense: 0.18,
        rebounding: 0.30,
        transition: 0.50,
        ballSecurity: 0.62,
      }),
      makePlayer('b-rim-anchor', 82, {
        creation: 0.10,
        spacing: 0.28,
        rimPressure: 0.40,
        perimeterDefense: 0.58,
        rimDefense: 0.95,
        rebounding: 0.95,
        transition: 0.45,
        ballSecurity: 0.40,
      }),
      makePlayer('b-wing', 78, {
        creation: 0.30,
        spacing: 0.72,
        rimPressure: 0.42,
        perimeterDefense: 0.82,
        rimDefense: 0.30,
        rebounding: 0.45,
        transition: 0.58,
        ballSecurity: 0.60,
      }),
      makePlayer('b-guard', 77, {
        creation: 0.66,
        spacing: 0.62,
        rimPressure: 0.55,
        perimeterDefense: 0.42,
        rimDefense: 0.22,
        rebounding: 0.32,
        transition: 0.63,
        ballSecurity: 0.78,
      }),
    ];

    const league = makeLeagueState(
      ['a-lead-creator', 'a-secondary-creator', 'a-shooter'],
      ['b-rim-anchor', 'b-wing', 'b-guard'],
    );

    const result = validateTradeProposal(
      league,
      'A',
      'B',
      ['a-secondary-creator'],
      ['b-rim-anchor'],
      players,
    );

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
