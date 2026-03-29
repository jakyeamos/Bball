import { describe, expect, it, vi } from 'vitest';
import type {
  ArchetypeProfile,
  DraftState,
  DraftTeam,
  FitVectors,
  Player,
  PlayerAdvancedProfile,
  PlayerFeatures,
  PlayerRawStats,
  PlayerValueModel,
} from '@nba-draft-sim/shared';
import { getAutopickPlayer } from '../../services/draftState';

function defaultRawStats(playerId: string): PlayerRawStats {
  return {
    playerId,
    name: playerId,
    team: 'TST',
    position: 'SG',
    PTS: 0,
    REB: 0,
    AST: 0,
    STL: 0,
    BLK: 0,
    TS_PCT: 0.55,
    MP_TOTAL: 1000,
    GP: 50,
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
    minutesLoad: 0.6,
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

function makeValueModel(
  draftValue: number,
  tradeValue: number,
  fitVectors: FitVectors,
): PlayerValueModel {
  return {
    draftValue,
    gameImpact: draftValue,
    tradeValue,
    fitVectors,
    minutesTier: 'starter',
    varianceProfile: 'balanced',
  };
}

function makePlayer(
  playerId: string,
  draftValue: number,
  fitVectors: FitVectors,
  overrides: Partial<Pick<Player, 'position' | 'rosterRole' | 'functionalRole'>> = {},
): Player {
  return {
    playerId,
    name: playerId,
    team: 'TST',
    position: overrides.position ?? 'SG',
    rosterRole: overrides.rosterRole ?? 'backcourt',
    functionalRole: overrides.functionalRole ?? 'primary_creator',
    rawStats: { ...defaultRawStats(playerId), position: overrides.position ?? 'SG' },
    advancedProfile: defaultAdvancedProfile(),
    valueModel: makeValueModel(draftValue, draftValue, fitVectors),
    features: defaultFeatures(),
    archetypes: defaultArchetypes(),
    impactRating: draftValue,
  };
}

describe('draft autopick', () => {
  it('prefers better fit over a redundant archetype when draft values are close', () => {
    const incumbentCreator = makePlayer('creator-1', 84, {
      creation: 0.92,
      spacing: 0.18,
      rimPressure: 0.74,
      perimeterDefense: 0.34,
      rimDefense: 0.12,
      rebounding: 0.22,
      transition: 0.58,
      ballSecurity: 0.76,
    }, { rosterRole: 'backcourt', functionalRole: 'primary_creator' });

    const incumbentGuard = makePlayer('creator-2', 80, {
      creation: 0.82,
      spacing: 0.24,
      rimPressure: 0.62,
      perimeterDefense: 0.40,
      rimDefense: 0.15,
      rebounding: 0.25,
      transition: 0.60,
      ballSecurity: 0.74,
    }, { rosterRole: 'backcourt', functionalRole: 'secondary_creator' });

    const redundantCreator = makePlayer('redundant-creator', 89, {
      creation: 0.95,
      spacing: 0.16,
      rimPressure: 0.72,
      perimeterDefense: 0.30,
      rimDefense: 0.10,
      rebounding: 0.20,
      transition: 0.62,
      ballSecurity: 0.78,
    }, { rosterRole: 'backcourt', functionalRole: 'primary_creator' });

    const fitBig = makePlayer('fit-big', 84, {
      creation: 0.22,
      spacing: 0.91,
      rimPressure: 0.48,
      perimeterDefense: 0.78,
      rimDefense: 0.94,
      rebounding: 0.88,
      transition: 0.56,
      ballSecurity: 0.54,
    }, { position: 'C', rosterRole: 'frontcourt', functionalRole: 'rim_big' });

    const teams: DraftTeam[] = [
      {
        teamId: 'A',
        userId: 'user-a',
        displayName: 'Team A',
        roster: [incumbentCreator.playerId, incumbentGuard.playerId],
        queue: [],
      },
      {
        teamId: 'B',
        userId: 'user-b',
        displayName: 'Team B',
        roster: [],
        queue: [],
      },
    ];

    const state: DraftState = {
      draftId: 'draft-1',
      status: 'active',
      config: {
        teamCount: 2,
        rosterSize: 5,
        pickTimer: 60,
        seasonFormat: 'quick_sim',
      },
      teams,
      draftOrder: [{ pickNumber: 1, round: 1, teamId: 'A' }],
      picks: [],
      currentPickIndex: 0,
      timeRemaining: 60,
      pausedBy: null,
      availablePlayers: [redundantCreator.playerId, fitBig.playerId],
      leagueSnapshotId: 'snapshot-1',
    };

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    const pick = getAutopickPlayer(state, [
      incumbentCreator,
      incumbentGuard,
      redundantCreator,
      fitBig,
    ]);

    randomSpy.mockRestore();

    expect(pick).toBe('fit-big');
  });
});
