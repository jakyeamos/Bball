import {
  CoachingDecision,
  DefensiveStrategy,
  FunctionalRole,
  LeagueSnapshot,
  LineupStrategy,
  MatchupDriver,
  OffensiveStrategy,
  Player,
  PlayerRawStats,
  RosterRole,
  TeamAggregation,
  TeamModel,
} from '@nba-draft-sim/shared';
import { aggregateTeam } from './aggregation';
import { createLeagueSnapshot } from './snapshot';
import { simulateMatchup } from './simulation';
import {
  ROSTER_ROLE_TARGET_SHARE,
  inferFunctionalRoleForPlayer,
  inferRosterRoleForPlayer,
} from './roleInference';

export interface CalibrationHarnessOptions {
  season: string;
  topPlayers: number;
  sims: number;
  teamSize: number;
  focusPlayers?: string[];
}

export interface PlayerCalibrationCard {
  playerId: string;
  name: string;
  team: string;
  position: string;
  gp: number;
  mpg: number;
  gameImpact: number;
  draftValue: number;
  tradeValue: number;
  reliability: number;
  volatility: number;
  fitVectors: Player['valueModel']['fitVectors'];
  advancedProfile: Player['advancedProfile'];
}

export interface PlayerOutlierEntry {
  player: PlayerCalibrationCard;
  delta: number;
}

export interface SyntheticTeamReport {
  key: string;
  label: string;
  focus: string;
  overallRating: number;
  roster: Array<{
    playerId: string;
    name: string;
    team: string;
    position: string;
    rosterRole: RosterRole;
    functionalRole: FunctionalRole;
    gameImpact: number;
  }>;
  composition: {
    guards: number;
    wings: number;
    bigs: number;
  };
  teamModel: TeamModel;
  modifiers: TeamAggregation['modifiers'];
}

export interface MatchupSensitivityReport {
  key: string;
  label: string;
  subjectTeam: string;
  weakOpponent: string;
  strongOpponent: string;
  weakWinPctA: number;
  strongWinPctA: number;
  delta: number;
  deltaStdDev: number;
  deltaConfidenceLow: number;
  deltaConfidenceHigh: number;
  pass: boolean;
  weakDrivers: MatchupDriver[];
  strongDrivers: MatchupDriver[];
}

export interface CoachingSensitivityVariant {
  label: string;
  strategyType: 'lineup' | 'offense' | 'defense';
  team: string;
  opponent: string;
  baselineWinPctA: number;
  winPctA: number;
  deltaFromBaseline: number;
  deltaStdDev: number;
  deltaConfidenceLow: number;
  deltaConfidenceHigh: number;
  stable: boolean;
}

export interface CoachingSensitivityReport {
  baselineTeam: string;
  peerTeam: string;
  baselineWinPctA: number;
  baselineScore: {
    finalScoreA: number;
    finalScoreB: number;
  };
  variants: CoachingSensitivityVariant[];
}

export interface CalibrationReport {
  generatedAt: string;
  season: string;
  inputPlayerCount: number;
  snapshotPlayerCount: number;
  leaders: {
    gameImpact: PlayerCalibrationCard[];
    draftValue: PlayerCalibrationCard[];
    tradeValue: PlayerCalibrationCard[];
  };
  outliers: {
    draftPremium: PlayerOutlierEntry[];
    tradePremium: PlayerOutlierEntry[];
    volatileStars: PlayerOutlierEntry[];
    lowReliabilityHighImpact: PlayerOutlierEntry[];
  };
  focusPlayers: PlayerCalibrationCard[];
  missingFocusPlayers: string[];
  syntheticTeams: SyntheticTeamReport[];
  matchupSensitivity: MatchupSensitivityReport[];
  coachingSensitivity: CoachingSensitivityReport;
}

interface CalibrationTeamSpec {
  key: string;
  label: string;
  focus: string;
  scorePlayer: (player: Player) => number;
  focusFitKeys?: Array<keyof Player['valueModel']['fitVectors']>;
  stylePenaltyWeight?: number;
}

const CALIBRATION_REPEATS = 5;
const DELTA_PASS_THRESHOLD = 0.03;
const DELTA_CONFIDENCE_Z = 1.645;

interface MatchupSensitivitySpec {
  key: string;
  label: string;
  subjectTeamKey: string;
  weakOpponentKey: string;
  strongOpponentKey: string;
}

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function round(value: number, digits = 3): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function confidenceInterval(values: number[], zScore = DELTA_CONFIDENCE_Z): { low: number; high: number } {
  if (values.length === 0) return { low: 0, high: 0 };
  const mean = average(values);
  const stdDev = standardDeviation(values);
  const margin = zScore * stdDev / Math.sqrt(values.length);
  return {
    low: mean - margin,
    high: mean + margin,
  };
}

function minutesPerGame(player: Player): number {
  return player.rawStats.MP_TOTAL / Math.max(player.rawStats.GP, 1);
}

function fitAverage(player: Player): number {
  const fit = player.valueModel.fitVectors;
  return average([
    fit.creation,
    fit.spacing,
    fit.rimPressure,
    fit.perimeterDefense,
    fit.rimDefense,
    fit.rebounding,
    fit.transition,
    fit.ballSecurity,
  ]);
}

function offTargetPenalty(player: Player, spec: CalibrationTeamSpec): number {
  const focusKeys = spec.focusFitKeys ?? [];
  if (focusKeys.length === 0) return 0;

  const focus = new Set<keyof Player['valueModel']['fitVectors']>(focusKeys);
  const keys: Array<keyof Player['valueModel']['fitVectors']> = [
    'creation',
    'spacing',
    'rimPressure',
    'perimeterDefense',
    'rimDefense',
    'rebounding',
    'transition',
    'ballSecurity',
  ];

  const offTarget = keys.filter((key) => !focus.has(key));
  return average(offTarget.map((key) => Math.abs(player.valueModel.fitVectors[key] - 0.5)));
}

function playerToCard(player: Player): PlayerCalibrationCard {
  return {
    playerId: player.playerId,
    name: player.name,
    team: player.team,
    position: player.position,
    gp: player.rawStats.GP,
    mpg: round(minutesPerGame(player), 1),
    gameImpact: round(player.valueModel.gameImpact, 1),
    draftValue: round(player.valueModel.draftValue, 1),
    tradeValue: round(player.valueModel.tradeValue, 1),
    reliability: round(player.advancedProfile.reliability, 3),
    volatility: round(player.advancedProfile.volatility, 3),
    fitVectors: player.valueModel.fitVectors,
    advancedProfile: player.advancedProfile,
  };
}

function sortBy<T>(items: T[], score: (item: T) => number): T[] {
  return [...items].sort((a, b) => score(b) - score(a));
}

function topCards(players: Player[], score: (player: Player) => number, count: number): PlayerCalibrationCard[] {
  return sortBy(players, score)
    .slice(0, count)
    .map(playerToCard);
}

function topOutliers(
  players: Player[],
  score: (player: Player) => number,
  count: number,
): PlayerOutlierEntry[] {
  return sortBy(players, score)
    .slice(0, count)
    .map((player) => ({
      player: playerToCard(player),
      delta: round(score(player), 2),
    }));
}

function findFocusPlayers(players: Player[], queries: string[] | undefined, fallbackCount: number): {
  focusPlayers: PlayerCalibrationCard[];
  missingFocusPlayers: string[];
} {
  if (!queries || queries.length === 0) {
    return {
      focusPlayers: topCards(players, (player) => player.valueModel.gameImpact, fallbackCount),
      missingFocusPlayers: [],
    };
  }

  const matches: Player[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();

  for (const rawQuery of queries) {
    const query = rawQuery.trim().toLowerCase();
    if (!query) continue;

    const exact = players.find((player) =>
      player.playerId.toLowerCase() === query
      || player.name.toLowerCase() === query
      || `${player.name} ${player.team}`.toLowerCase() === query,
    );

    const partial = exact
      ?? sortBy(
        players.filter((player) =>
          player.name.toLowerCase().includes(query)
          || player.playerId.toLowerCase().includes(query)
          || player.team.toLowerCase() === query,
        ),
        (player) => player.valueModel.gameImpact,
      )[0];

    if (!partial) {
      missing.push(rawQuery);
      continue;
    }

    if (!seen.has(partial.playerId)) {
      seen.add(partial.playerId);
      matches.push(partial);
    }
  }

  return {
    focusPlayers: matches.map(playerToCard),
    missingFocusPlayers: missing,
  };
}

function rosterRoleOf(player: Player): RosterRole {
  return inferRosterRoleForPlayer(player);
}

function functionalRoleOf(player: Player): FunctionalRole {
  return inferFunctionalRoleForPlayer(player);
}

function buildRosterMinimums(teamSize: number): Record<RosterRole, number> {
  if (teamSize <= 3) {
    return {
      backcourt: 1,
      wing: teamSize >= 2 ? 1 : 0,
      frontcourt: teamSize >= 3 ? 1 : 0,
    };
  }

  return {
    backcourt: Math.max(2, Math.round(teamSize * ROSTER_ROLE_TARGET_SHARE.backcourt * 0.55)),
    wing: Math.max(2, Math.round(teamSize * ROSTER_ROLE_TARGET_SHARE.wing * 0.55)),
    frontcourt: Math.max(2, Math.round(teamSize * ROSTER_ROLE_TARGET_SHARE.frontcourt * 0.55)),
  };
}

function draftCalibrationRoster(
  players: Player[],
  spec: CalibrationTeamSpec,
  teamSize: number,
  excludeIds: Set<string> = new Set(),
): Player[] {
  const selected: Player[] = [];
  const selectedIds = new Set<string>(excludeIds);
  const sortedCandidates = sortBy(
    players.filter((player) => !selectedIds.has(player.playerId)),
    (player) =>
      spec.scorePlayer(player) - offTargetPenalty(player, spec) * (spec.stylePenaltyWeight ?? 0) * 20,
  );

  const roleMinimums = buildRosterMinimums(teamSize);

  for (const role of ['backcourt', 'wing', 'frontcourt'] as const) {
    const candidates = sortedCandidates.filter((player) => rosterRoleOf(player) === role);
    for (const player of candidates) {
      if (selected.length >= teamSize || roleMinimums[role] <= 0) break;
      if (selectedIds.has(player.playerId)) continue;
      selected.push(player);
      selectedIds.add(player.playerId);
      roleMinimums[role] -= 1;
    }
  }

  for (const player of sortedCandidates) {
    if (selected.length >= teamSize) break;
    if (selectedIds.has(player.playerId)) continue;
    selected.push(player);
    selectedIds.add(player.playerId);
  }

  return selected;
}

function buildDisjointScenarioTeams(
  players: Player[],
  teamKeys: string[],
  teamSize: number,
): Map<string, TeamAggregation> {
  const specMap = new Map(TEAM_SPECS.map((spec) => [spec.key, spec]));
  const teamMap = new Map<string, TeamAggregation>();
  const usedIds = new Set<string>();

  for (const key of teamKeys) {
    const spec = specMap.get(key) ?? (key === 'balanced_peer' ? specMap.get('balanced_contender') : undefined);
    if (!spec) {
      throw new Error(`Unknown calibration team spec: ${key}`);
    }

    const roster = draftCalibrationRoster(players, spec, teamSize, usedIds);
    roster.forEach((player) => usedIds.add(player.playerId));
    teamMap.set(key, aggregateTeam(roster, key));
  }

  return teamMap;
}

function buildTeamReport(
  key: string,
  label: string,
  focus: string,
  team: TeamAggregation,
  roster: Player[],
): SyntheticTeamReport {
  const composition = roster.reduce(
    (acc, player) => {
      const role = rosterRoleOf(player);
      if (role === 'backcourt') acc.guards += 1;
      if (role === 'wing') acc.wings += 1;
      if (role === 'frontcourt') acc.bigs += 1;
      return acc;
    },
    { guards: 0, wings: 0, bigs: 0 },
  );

  return {
    key,
    label,
    focus,
    overallRating: round(team.overallRating, 2),
    roster: roster.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      team: player.team,
      position: player.position,
      rosterRole: rosterRoleOf(player),
      functionalRole: functionalRoleOf(player),
      gameImpact: round(player.valueModel.gameImpact, 1),
    })),
    composition,
    teamModel: {
      ...team.teamModel,
      possessionVolume: round(team.teamModel.possessionVolume, 2),
      transitionShare: round(team.teamModel.transitionShare, 3),
      transitionDefense: round(team.teamModel.transitionDefense, 3),
      turnoverRate: round(team.teamModel.turnoverRate, 3),
      foulRate: round(team.teamModel.foulRate, 3),
      freeThrowRate: round(team.teamModel.freeThrowRate, 3),
      rimRate: round(team.teamModel.rimRate, 3),
      rimAccuracy: round(team.teamModel.rimAccuracy, 3),
      paintRate: round(team.teamModel.paintRate, 3),
      paintAccuracy: round(team.teamModel.paintAccuracy, 3),
      threeRate: round(team.teamModel.threeRate, 3),
      threeAccuracy: round(team.teamModel.threeAccuracy, 3),
      offensiveReboundRate: round(team.teamModel.offensiveReboundRate, 3),
      ballSecurity: round(team.teamModel.ballSecurity, 3),
      primaryCreation: round(team.teamModel.primaryCreation, 3),
      secondaryCreation: round(team.teamModel.secondaryCreation, 3),
      spacing: round(team.teamModel.spacing, 3),
      rimPressure: round(team.teamModel.rimPressure, 3),
      finishing: round(team.teamModel.finishing, 3),
      perimeterDefense: round(team.teamModel.perimeterDefense, 3),
      rimDefense: round(team.teamModel.rimDefense, 3),
      ballPressure: round(team.teamModel.ballPressure, 3),
      paintPacking: round(team.teamModel.paintPacking, 3),
      rimContest: round(team.teamModel.rimContest, 3),
      closeoutIntegrity: round(team.teamModel.closeoutIntegrity, 3),
      reboundPositioning: round(team.teamModel.reboundPositioning, 3),
      turnoverPressure: round(team.teamModel.turnoverPressure, 3),
      defensiveReboundRate: round(team.teamModel.defensiveReboundRate, 3),
      foulDiscipline: round(team.teamModel.foulDiscipline, 3),
      benchDepth: round(team.teamModel.benchDepth, 3),
      volatility: round(team.teamModel.volatility, 3),
      switchability: round(team.teamModel.switchability, 3),
      transitionContainment: round(team.teamModel.transitionContainment, 3),
    },
    modifiers: {
      total: round(team.modifiers.total, 3),
      shootBonus: round(team.modifiers.shootBonus, 3),
      creatorPen: round(team.modifiers.creatorPen, 3),
      rimPen: round(team.modifiers.rimPen, 3),
      offenseBonus: round(team.modifiers.offenseBonus, 3),
      offensePenalty: round(team.modifiers.offensePenalty, 3),
      defenseBonus: round(team.modifiers.defenseBonus, 3),
      defensePenalty: round(team.modifiers.defensePenalty, 3),
      variancePenalty: round(team.modifiers.variancePenalty, 3),
      homeCourtAdvantage: round(team.modifiers.homeCourtAdvantage, 3),
    },
  };
}

function fit(player: Player) {
  return player.valueModel.fitVectors;
}

function profile(player: Player) {
  return player.advancedProfile;
}

const TEAM_SPECS: CalibrationTeamSpec[] = [
  {
    key: 'balanced_contender',
    label: 'Balanced Contender',
    focus: 'High-impact all-around roster',
    focusFitKeys: ['creation', 'spacing', 'rimPressure', 'perimeterDefense', 'rimDefense', 'rebounding', 'transition', 'ballSecurity'],
    stylePenaltyWeight: 0,
    scorePlayer: (player) =>
      player.valueModel.gameImpact * 0.62
      + fitAverage(player) * 22
      + profile(player).reliability * 10
      - profile(player).volatility * 4,
  },
  {
    key: 'rim_pressure_attack',
    label: 'Rim Pressure Attack',
    focus: 'Creation, downhill pressure, foul pressure',
    focusFitKeys: ['rimPressure', 'creation'],
    stylePenaltyWeight: 0.16,
    scorePlayer: (player) =>
      fit(player).rimPressure * 42
      + profile(player).shotCreation * 16
      + profile(player).playmaking * 10
      + player.valueModel.gameImpact * 0.34
      + profile(player).reliability * 8,
  },
  {
    key: 'weak_rim_defense',
    label: 'Weak Rim Defense',
    focus: 'Interior resistance intentionally thin',
    focusFitKeys: ['creation'],
    stylePenaltyWeight: 0.08,
    scorePlayer: (player) =>
      (1 - fit(player).rimDefense) * 40
      + (1 - profile(player).foulDiscipline) * 10
      + player.valueModel.gameImpact * 0.24
      + fit(player).creation * 12,
  },
  {
    key: 'rim_defense_wall',
    label: 'Rim Defense Wall',
    focus: 'Rim deterrence and rebounding security',
    focusFitKeys: ['rimDefense', 'rebounding'],
    stylePenaltyWeight: 0.16,
    scorePlayer: (player) =>
      fit(player).rimDefense * 44
      + fit(player).rebounding * 18
      + profile(player).foulDiscipline * 10
      + player.valueModel.gameImpact * 0.30,
  },
  {
    key: 'turnover_pressure_defense',
    label: 'Turnover Pressure Defense',
    focus: 'Point-of-attack disruption and chaos',
    focusFitKeys: ['perimeterDefense', 'transition'],
    stylePenaltyWeight: 0.16,
    scorePlayer: (player) =>
      average([
        profile(player).perimeterDefense,
        profile(player).transitionDefense,
        profile(player).switchability,
      ]) * 40
      + fit(player).perimeterDefense * 16
      + player.features.DEFLECTIONS! * 1.2
      + player.valueModel.gameImpact * 0.24,
  },
  {
    key: 'turnover_prone_offense',
    label: 'Turnover-Prone Offense',
    focus: 'High-usage creation with weak security',
    focusFitKeys: ['creation'],
    stylePenaltyWeight: 0.08,
    scorePlayer: (player) =>
      (1 - fit(player).ballSecurity) * 34
      + fit(player).creation * 18
      + profile(player).onBallUsage * 10
      + player.valueModel.gameImpact * 0.28,
  },
  {
    key: 'ball_security_offense',
    label: 'Ball-Security Offense',
    focus: 'Creation with strong turnover resistance',
    focusFitKeys: ['ballSecurity', 'creation'],
    stylePenaltyWeight: 0.16,
    scorePlayer: (player) =>
      fit(player).ballSecurity * 36
      + fit(player).creation * 18
      + fit(player).spacing * 10
      + player.valueModel.gameImpact * 0.28,
  },
  {
    key: 'transition_attack',
    label: 'Transition Attack',
    focus: 'Pace, open-floor pressure, early offense',
    focusFitKeys: ['transition', 'rimPressure'],
    stylePenaltyWeight: 0.14,
    scorePlayer: (player) =>
      profile(player).transitionOffense * 38
      + fit(player).rimPressure * 14
      + profile(player).shotCreation * 8
      + player.valueModel.gameImpact * 0.28,
  },
  {
    key: 'poor_transition_defense',
    label: 'Poor Transition Defense',
    focus: 'Transition containment intentionally weak',
    focusFitKeys: ['creation'],
    stylePenaltyWeight: 0.08,
    scorePlayer: (player) =>
      (1 - profile(player).transitionDefense) * 38
      + (1 - profile(player).perimeterDefense) * 16
      + player.valueModel.gameImpact * 0.26
      + fit(player).creation * 8,
  },
  {
    key: 'transition_defense',
    label: 'Transition Defense',
    focus: 'Floor balance and perimeter containment',
    focusFitKeys: ['transition', 'perimeterDefense'],
    stylePenaltyWeight: 0.16,
    scorePlayer: (player) =>
      profile(player).transitionDefense * 40
      + fit(player).perimeterDefense * 18
      + profile(player).switchability * 10
      + player.valueModel.gameImpact * 0.26,
  },
  {
    key: 'offensive_glass',
    label: 'Offensive Glass',
    focus: 'Second-chance pressure and paint activity',
    focusFitKeys: ['rebounding', 'rimPressure'],
    stylePenaltyWeight: 0.14,
    scorePlayer: (player) =>
      profile(player).offensiveRebounding * 42
      + fit(player).rimPressure * 14
      + profile(player).finishing * 8
      + player.valueModel.gameImpact * 0.26,
  },
  {
    key: 'weak_defensive_glass',
    label: 'Weak Defensive Glass',
    focus: 'Defensive rebounding security intentionally weak',
    focusFitKeys: ['creation', 'spacing'],
    stylePenaltyWeight: 0.08,
    scorePlayer: (player) =>
      (1 - profile(player).defensiveRebounding) * 40
      + (1 - fit(player).rimDefense) * 10
      + player.valueModel.gameImpact * 0.25
      + fit(player).creation * 8,
  },
  {
    key: 'defensive_glass',
    label: 'Defensive Glass',
    focus: 'Box-outs and possession-ending rebounds',
    focusFitKeys: ['rebounding', 'rimDefense'],
    stylePenaltyWeight: 0.15,
    scorePlayer: (player) =>
      profile(player).defensiveRebounding * 42
      + fit(player).rimDefense * 16
      + profile(player).foulDiscipline * 6
      + player.valueModel.gameImpact * 0.26,
  },
  {
    key: 'spacing_attack',
    label: 'Spacing Attack',
    focus: 'Gravity, spacing, off-ball shot quality',
    focusFitKeys: ['spacing'],
    stylePenaltyWeight: 0.18,
    scorePlayer: (player) =>
      fit(player).spacing * 44
      + profile(player).offBallValue * 12
      + profile(player).shotCreation * 8
      + player.valueModel.gameImpact * 0.26,
  },
  {
    key: 'paint_packing_defense',
    label: 'Paint Packing Defense',
    focus: 'Protects the paint but concedes perimeter quality',
    focusFitKeys: ['rimDefense', 'rebounding'],
    stylePenaltyWeight: 0.12,
    scorePlayer: (player) =>
      fit(player).rimDefense * 28
      + (1 - fit(player).perimeterDefense) * 18
      + profile(player).defensiveRebounding * 8
      + player.valueModel.gameImpact * 0.28,
  },
  {
    key: 'perimeter_denial',
    label: 'Perimeter Denial',
    focus: 'Switchability and point-of-attack coverage',
    focusFitKeys: ['perimeterDefense', 'transition'],
    stylePenaltyWeight: 0.16,
    scorePlayer: (player) =>
      fit(player).perimeterDefense * 42
      + profile(player).switchability * 14
      + profile(player).transitionDefense * 8
      + player.valueModel.gameImpact * 0.28,
  },
];

const MATCHUP_SENSITIVITY_SPECS: MatchupSensitivitySpec[] = [
  {
    key: 'rim_pressure_sensitivity',
    label: 'Rim Pressure Sensitivity',
    subjectTeamKey: 'rim_pressure_attack',
    weakOpponentKey: 'weak_rim_defense',
    strongOpponentKey: 'rim_defense_wall',
  },
  {
    key: 'turnover_pressure_sensitivity',
    label: 'Turnover Pressure Sensitivity',
    subjectTeamKey: 'turnover_pressure_defense',
    weakOpponentKey: 'turnover_prone_offense',
    strongOpponentKey: 'ball_security_offense',
  },
  {
    key: 'transition_sensitivity',
    label: 'Transition Sensitivity',
    subjectTeamKey: 'transition_attack',
    weakOpponentKey: 'poor_transition_defense',
    strongOpponentKey: 'transition_defense',
  },
  {
    key: 'offensive_glass_sensitivity',
    label: 'Offensive Glass Sensitivity',
    subjectTeamKey: 'offensive_glass',
    weakOpponentKey: 'weak_defensive_glass',
    strongOpponentKey: 'defensive_glass',
  },
  {
    key: 'spacing_sensitivity',
    label: 'Spacing Sensitivity',
    subjectTeamKey: 'spacing_attack',
    weakOpponentKey: 'paint_packing_defense',
    strongOpponentKey: 'perimeter_denial',
  },
];

function buildSyntheticTeams(
  players: Player[],
  teamSize: number,
): {
  teamMap: Map<string, TeamAggregation>;
  reports: SyntheticTeamReport[];
} {
  const teamMap = new Map<string, TeamAggregation>();
  const reports: SyntheticTeamReport[] = [];
  let balancedRosterIds = new Set<string>();

  for (const spec of TEAM_SPECS) {
    const excludeIds = spec.key === 'balanced_peer' ? balancedRosterIds : new Set<string>();
    const roster = draftCalibrationRoster(players, spec, teamSize, excludeIds);
    const aggregation = aggregateTeam(roster, spec.key);
    teamMap.set(spec.key, aggregation);
    reports.push(buildTeamReport(spec.key, spec.label, spec.focus, aggregation, roster));
    if (spec.key === 'balanced_contender') {
      balancedRosterIds = new Set(roster.map((player) => player.playerId));
    }
  }

  const contenderSpec = TEAM_SPECS.find((spec) => spec.key === 'balanced_contender');
  if (contenderSpec) {
    const peerRoster = draftCalibrationRoster(players, contenderSpec, teamSize, balancedRosterIds);
    const peerAgg = aggregateTeam(peerRoster, 'balanced_peer');
    teamMap.set('balanced_peer', peerAgg);
    reports.push(buildTeamReport('balanced_peer', 'Balanced Peer', 'Second balanced contender built from remaining players', peerAgg, peerRoster));
  }

  return { teamMap, reports };
}

function buildSensitivityReport(
  players: Player[],
  teamSize: number,
  sims: number,
): MatchupSensitivityReport[] {
  return MATCHUP_SENSITIVITY_SPECS.map((spec) => {
    const scenarioTeams = buildDisjointScenarioTeams(
      players,
      [spec.subjectTeamKey, spec.weakOpponentKey, spec.strongOpponentKey],
      teamSize,
    );
    const subjectTeam = scenarioTeams.get(spec.subjectTeamKey);
    const weakOpponent = scenarioTeams.get(spec.weakOpponentKey);
    const strongOpponent = scenarioTeams.get(spec.strongOpponentKey);

    if (!subjectTeam || !weakOpponent || !strongOpponent) {
      throw new Error(`Missing synthetic team for sensitivity scenario ${spec.key}`);
    }

    const weakWinPcts: number[] = [];
    const strongWinPcts: number[] = [];
    const deltas: number[] = [];
    let weakDrivers: MatchupDriver[] = [];
    let strongDrivers: MatchupDriver[] = [];

    for (let repeat = 0; repeat < CALIBRATION_REPEATS; repeat++) {
      const weakResult = simulateMatchup(subjectTeam, weakOpponent, null, undefined, undefined, sims);
      const strongResult = simulateMatchup(subjectTeam, strongOpponent, null, undefined, undefined, sims);
      weakWinPcts.push(weakResult.winPctA);
      strongWinPcts.push(strongResult.winPctA);
      deltas.push(weakResult.winPctA - strongResult.winPctA);
      weakDrivers = weakResult.drivers.slice(0, 3);
      strongDrivers = strongResult.drivers.slice(0, 3);
    }

    const deltaMean = average(deltas);
    const deltaStdDev = standardDeviation(deltas);
    const deltaConfidence = confidenceInterval(deltas);

    return {
      key: spec.key,
      label: spec.label,
      subjectTeam: spec.subjectTeamKey,
      weakOpponent: spec.weakOpponentKey,
      strongOpponent: spec.strongOpponentKey,
      weakWinPctA: round(average(weakWinPcts), 3),
      strongWinPctA: round(average(strongWinPcts), 3),
      delta: round(deltaMean, 3),
      deltaStdDev: round(deltaStdDev, 3),
      deltaConfidenceLow: round(deltaConfidence.low, 3),
      deltaConfidenceHigh: round(deltaConfidence.high, 3),
      pass: deltaMean >= DELTA_PASS_THRESHOLD && deltaConfidence.low > 0,
      weakDrivers,
      strongDrivers,
    };
  });
}

function buildCoachingDecision(
  team: TeamAggregation,
  lineupStrategy: LineupStrategy,
  offensiveStrategy: OffensiveStrategy,
  defensiveStrategy: DefensiveStrategy,
): CoachingDecision {
  return {
    teamId: team.teamId,
    roundNumber: 1,
    rotation: team.rotation.map((player) => player.playerId),
    rotationDepth: team.rotation.length,
    lineupStrategy,
    offensiveStrategy,
    defensiveStrategy,
    submittedAt: new Date().toISOString(),
  };
}

function buildCoachingSensitivity(
  players: Player[],
  teamSize: number,
  sims: number,
): CoachingSensitivityReport {
  const baselineTeams = buildDisjointScenarioTeams(players, ['balanced_contender', 'balanced_peer'], teamSize);
  const contender = baselineTeams.get('balanced_contender');
  const peer = baselineTeams.get('balanced_peer');

  if (!contender || !peer) {
    throw new Error('Balanced contender teams are required for coaching sensitivity');
  }

  const baselineDecision = buildCoachingDecision(contender, 'balanced', 'balanced_attack', 'standard');
  const peerDecision = buildCoachingDecision(peer, 'balanced', 'balanced_attack', 'standard');
  const baseline = simulateMatchup(contender, peer, 'A', baselineDecision, peerDecision, sims);

  const variants: Array<{
    label: string;
    strategyType: 'lineup' | 'offense' | 'defense';
    teamKey: string;
    opponentKey: string;
    decision: CoachingDecision;
  }> = [
    {
      label: 'Lineup: small_ball',
      strategyType: 'lineup',
      teamKey: 'spacing_attack',
      opponentKey: 'paint_packing_defense',
      decision: buildCoachingDecision(contender, 'small_ball', 'balanced_attack', 'standard'),
    },
    {
      label: 'Lineup: big_lineup',
      strategyType: 'lineup',
      teamKey: 'rim_defense_wall',
      opponentKey: 'rim_pressure_attack',
      decision: buildCoachingDecision(contender, 'big_lineup', 'balanced_attack', 'standard'),
    },
    {
      label: 'Offense: pace_and_space',
      strategyType: 'offense',
      teamKey: 'spacing_attack',
      opponentKey: 'paint_packing_defense',
      decision: buildCoachingDecision(contender, 'balanced', 'pace_and_space', 'standard'),
    },
    {
      label: 'Offense: inside_out',
      strategyType: 'offense',
      teamKey: 'rim_pressure_attack',
      opponentKey: 'balanced_peer',
      decision: buildCoachingDecision(contender, 'balanced', 'inside_out', 'standard'),
    },
    {
      label: 'Offense: motion_offense',
      strategyType: 'offense',
      teamKey: 'balanced_contender',
      opponentKey: 'balanced_peer',
      decision: buildCoachingDecision(contender, 'balanced', 'motion_offense', 'standard'),
    },
    {
      label: 'Defense: pressure_ball',
      strategyType: 'defense',
      teamKey: 'turnover_pressure_defense',
      opponentKey: 'turnover_prone_offense',
      decision: buildCoachingDecision(contender, 'balanced', 'balanced_attack', 'pressure_ball'),
    },
    {
      label: 'Defense: protect_paint',
      strategyType: 'defense',
      teamKey: 'paint_packing_defense',
      opponentKey: 'rim_pressure_attack',
      decision: buildCoachingDecision(contender, 'balanced', 'balanced_attack', 'protect_paint'),
    },
    {
      label: 'Defense: switch_everything',
      strategyType: 'defense',
      teamKey: 'perimeter_denial',
      opponentKey: 'spacing_attack',
      decision: buildCoachingDecision(contender, 'balanced', 'balanced_attack', 'switch_everything'),
    },
  ];

  return {
    baselineTeam: 'balanced_contender',
    peerTeam: 'balanced_peer',
    baselineWinPctA: round(baseline.winPctA, 3),
    baselineScore: {
      finalScoreA: baseline.finalScoreA ?? 0,
      finalScoreB: baseline.finalScoreB ?? 0,
    },
    variants: variants.map((variant) => {
      const scenarioTeams = buildDisjointScenarioTeams(players, [variant.teamKey, variant.opponentKey], teamSize);
      const team = scenarioTeams.get(variant.teamKey) ?? contender;
      const opponent = scenarioTeams.get(variant.opponentKey) ?? peer;
      const teamBaselineDecision = buildCoachingDecision(team, 'balanced', 'balanced_attack', 'standard');
      const opponentBaselineDecision = buildCoachingDecision(opponent, 'balanced', 'balanced_attack', 'standard');
      const variantDecision = buildCoachingDecision(
        team,
        variant.decision.lineupStrategy,
        variant.decision.offensiveStrategy,
        variant.decision.defensiveStrategy,
      );
      const baselineWinPcts: number[] = [];
      const resultWinPcts: number[] = [];
      const deltas: number[] = [];

      for (let repeat = 0; repeat < CALIBRATION_REPEATS; repeat++) {
        const variantBaseline = simulateMatchup(team, opponent, 'A', teamBaselineDecision, opponentBaselineDecision, sims);
        const result = simulateMatchup(team, opponent, 'A', variantDecision, opponentBaselineDecision, sims);
        baselineWinPcts.push(variantBaseline.winPctA);
        resultWinPcts.push(result.winPctA);
        deltas.push(result.winPctA - variantBaseline.winPctA);
      }

      const deltaMean = average(deltas);
      const deltaStdDev = standardDeviation(deltas);
      const deltaConfidence = confidenceInterval(deltas);
      return {
        label: variant.label,
        strategyType: variant.strategyType,
        team: variant.teamKey,
        opponent: variant.opponentKey,
        baselineWinPctA: round(average(baselineWinPcts), 3),
        winPctA: round(average(resultWinPcts), 3),
        deltaFromBaseline: round(deltaMean, 3),
        deltaStdDev: round(deltaStdDev, 3),
        deltaConfidenceLow: round(deltaConfidence.low, 3),
        deltaConfidenceHigh: round(deltaConfidence.high, 3),
        stable: deltaConfidence.low > 0,
      };
    }),
  };
}

function buildReportFromSnapshot(
  snapshot: LeagueSnapshot,
  inputPlayerCount: number,
  options: CalibrationHarnessOptions,
): CalibrationReport {
  const players = snapshot.players;
  const { reports } = buildSyntheticTeams(players, options.teamSize);
  const focus = findFocusPlayers(players, options.focusPlayers, Math.min(options.topPlayers, 8));

  return {
    generatedAt: new Date().toISOString(),
    season: options.season,
    inputPlayerCount,
    snapshotPlayerCount: players.length,
    leaders: {
      gameImpact: topCards(players, (player) => player.valueModel.gameImpact, options.topPlayers),
      draftValue: topCards(players, (player) => player.valueModel.draftValue, options.topPlayers),
      tradeValue: topCards(players, (player) => player.valueModel.tradeValue, options.topPlayers),
    },
    outliers: {
      draftPremium: topOutliers(
        players,
        (player) => player.valueModel.draftValue - player.valueModel.gameImpact,
        options.topPlayers,
      ),
      tradePremium: topOutliers(
        players,
        (player) => player.valueModel.tradeValue - player.valueModel.gameImpact,
        options.topPlayers,
      ),
      volatileStars: topOutliers(
        players,
        (player) => player.valueModel.gameImpact * player.advancedProfile.volatility,
        options.topPlayers,
      ),
      lowReliabilityHighImpact: topOutliers(
        players,
        (player) => player.valueModel.gameImpact * (1 - player.advancedProfile.reliability),
        options.topPlayers,
      ),
    },
    focusPlayers: focus.focusPlayers,
    missingFocusPlayers: focus.missingFocusPlayers,
    syntheticTeams: reports,
    matchupSensitivity: buildSensitivityReport(players, options.teamSize, options.sims),
    coachingSensitivity: buildCoachingSensitivity(players, options.teamSize, options.sims),
  };
}

export async function generateCalibrationReport(
  rawStats: PlayerRawStats[],
  options: CalibrationHarnessOptions,
): Promise<CalibrationReport> {
  const snapshot = await createLeagueSnapshot(rawStats, options.season);
  return buildReportFromSnapshot(snapshot, rawStats.length, options);
}

function renderLeaderSection(label: string, players: PlayerCalibrationCard[]): string[] {
  return [
    label,
    ...players.map((player, index) =>
      `${index + 1}. ${player.name} (${player.team}, ${player.position}) ` +
      `GI ${player.gameImpact.toFixed(1)} DV ${player.draftValue.toFixed(1)} TV ${player.tradeValue.toFixed(1)} ` +
      `rel ${player.reliability.toFixed(2)} vol ${player.volatility.toFixed(2)}`,
    ),
  ];
}

function renderOutlierSection(label: string, outliers: PlayerOutlierEntry[]): string[] {
  return [
    label,
    ...outliers.map((entry, index) =>
      `${index + 1}. ${entry.player.name} (${entry.player.team}) delta ${entry.delta.toFixed(2)} ` +
      `GI ${entry.player.gameImpact.toFixed(1)} DV ${entry.player.draftValue.toFixed(1)} TV ${entry.player.tradeValue.toFixed(1)}`,
    ),
  ];
}

function renderTeamSection(team: SyntheticTeamReport): string[] {
  const model = team.teamModel;
  const rosterRoleLabel = (role: RosterRole) => role === 'backcourt' ? 'G' : role === 'wing' ? 'W' : 'B';
  const functionalRoleLabel = (role: FunctionalRole) => ({
    primary_creator: 'PC',
    secondary_creator: 'SC',
    connector: 'CN',
    movement_shooter: 'MS',
    slasher_finisher: 'SFn',
    two_way_wing: 'TWW',
    stretch_big: 'SB',
    rim_big: 'RB',
  }[role]);

  return [
    `${team.label} [${team.key}] ORtg ${team.overallRating.toFixed(1)} ${team.focus}`,
    `  roster: ${team.roster.map((player) => `${player.name} (${rosterRoleLabel(player.rosterRole)}/${functionalRoleLabel(player.functionalRole)}/${player.position})`).join(', ')}`,
    `  composition: G ${team.composition.guards} W ${team.composition.wings} B ${team.composition.bigs}`,
    `  teamModel: creation ${model.primaryCreation.toFixed(3)} spacing ${model.spacing.toFixed(3)} rim ${model.rimPressure.toFixed(3)} ` +
    `perimD ${model.perimeterDefense.toFixed(3)} rimD ${model.rimDefense.toFixed(3)} oreb ${model.offensiveReboundRate.toFixed(3)} ` +
    `dreb ${model.defensiveReboundRate.toFixed(3)} trans ${model.transitionShare.toFixed(3)} transD ${model.transitionDefense.toFixed(3)}`,
    `  defenseModel: bp ${model.ballPressure.toFixed(3)} close ${model.closeoutIntegrity.toFixed(3)} ` +
    `paint ${model.paintPacking.toFixed(3)} rimC ${model.rimContest.toFixed(3)} ` +
    `rpos ${model.reboundPositioning.toFixed(3)} transC ${model.transitionContainment.toFixed(3)}`,
  ];
}

export function renderCalibrationReport(report: CalibrationReport): string {
  const lines: string[] = [];

  lines.push(`Draft Sim Calibration Report`);
  lines.push(`Season: ${report.season}`);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Players: input ${report.inputPlayerCount}, snapshot ${report.snapshotPlayerCount}`);
  lines.push('');

  lines.push(...renderLeaderSection('Top Game Impact', report.leaders.gameImpact));
  lines.push('');
  lines.push(...renderLeaderSection('Top Draft Value', report.leaders.draftValue));
  lines.push('');
  lines.push(...renderLeaderSection('Top Trade Value', report.leaders.tradeValue));
  lines.push('');

  lines.push(...renderOutlierSection('Draft Premium Outliers', report.outliers.draftPremium));
  lines.push('');
  lines.push(...renderOutlierSection('Trade Premium Outliers', report.outliers.tradePremium));
  lines.push('');
  lines.push(...renderOutlierSection('Volatile Star Outliers', report.outliers.volatileStars));
  lines.push('');
  lines.push(...renderOutlierSection('Low Reliability High Impact', report.outliers.lowReliabilityHighImpact));
  lines.push('');

  lines.push('Focus Players');
  for (const player of report.focusPlayers) {
    lines.push(
      `${player.name} (${player.team}, ${player.position}) ` +
      `GI ${player.gameImpact.toFixed(1)} DV ${player.draftValue.toFixed(1)} TV ${player.tradeValue.toFixed(1)} ` +
      `creation ${player.fitVectors.creation.toFixed(3)} spacing ${player.fitVectors.spacing.toFixed(3)} ` +
      `rim ${player.fitVectors.rimPressure.toFixed(3)} perimD ${player.fitVectors.perimeterDefense.toFixed(3)} ` +
      `rimD ${player.fitVectors.rimDefense.toFixed(3)} rel ${player.reliability.toFixed(2)} vol ${player.volatility.toFixed(2)}`,
    );
  }
  if (report.missingFocusPlayers.length > 0) {
    lines.push(`Missing focus players: ${report.missingFocusPlayers.join(', ')}`);
  }
  lines.push('');

  lines.push('Synthetic Teams');
  for (const team of report.syntheticTeams) {
    lines.push(...renderTeamSection(team));
  }
  lines.push('');

  lines.push('Matchup Sensitivity');
  for (const sensitivity of report.matchupSensitivity) {
    lines.push(
      `${sensitivity.label}: ${sensitivity.subjectTeam} vs ${sensitivity.weakOpponent} ${sensitivity.weakWinPctA.toFixed(3)} ` +
      `| vs ${sensitivity.strongOpponent} ${sensitivity.strongWinPctA.toFixed(3)} ` +
      `| delta ${sensitivity.delta.toFixed(3)} ci [${sensitivity.deltaConfidenceLow.toFixed(3)}, ${sensitivity.deltaConfidenceHigh.toFixed(3)}] ` +
      `${sensitivity.pass ? 'PASS' : 'CHECK'}`,
    );
    lines.push(
      `  weak drivers: ${sensitivity.weakDrivers.map((driver) => `${driver.category}:${driver.impact.toFixed(2)}:${driver.advantage}`).join(', ')}`,
    );
    lines.push(
      `  strong drivers: ${sensitivity.strongDrivers.map((driver) => `${driver.category}:${driver.impact.toFixed(2)}:${driver.advantage}`).join(', ')}`,
    );
  }
  lines.push('');

  lines.push('Coaching Sensitivity');
  lines.push(
    `Baseline ${report.coachingSensitivity.baselineTeam} vs ${report.coachingSensitivity.peerTeam}: ` +
    `${report.coachingSensitivity.baselineWinPctA.toFixed(3)} ` +
    `sample ${report.coachingSensitivity.baselineScore.finalScoreA}-${report.coachingSensitivity.baselineScore.finalScoreB}`,
  );
  for (const variant of report.coachingSensitivity.variants) {
    lines.push(
      `${variant.label}: ${variant.team} vs ${variant.opponent} ` +
      `base ${variant.baselineWinPctA.toFixed(3)} winPct ${variant.winPctA.toFixed(3)} ` +
      `delta ${variant.deltaFromBaseline.toFixed(3)} ` +
      `ci [${variant.deltaConfidenceLow.toFixed(3)}, ${variant.deltaConfidenceHigh.toFixed(3)}] ` +
      `${variant.stable ? 'STABLE' : 'NOISY'}`,
    );
  }

  return lines.join('\n');
}
