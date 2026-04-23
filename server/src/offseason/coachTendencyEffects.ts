import {
  OffseasonCoachProfile,
  OffseasonCoachTendencyProfile,
} from '@nba-draft-sim/shared';
import coachesSeed from '../../data/coaches-seed.json';

interface CoachesSeedCoach {
  teamAbbreviation: string;
  headCoachName: string;
  pace: 'slow' | 'medium' | 'fast';
  scheme: string;
  youthDevelopment: boolean;
  driverFriendly: boolean;
  shooterFriendly: boolean;
}

interface CoachesSeedFile {
  schemaVersion: number;
  coaches: CoachesSeedCoach[];
}

const PACE_BIAS: Record<'slow' | 'medium' | 'fast', number> = {
  slow: -0.05,
  medium: 0,
  fast: 0.08,
};

function clampBias(value: number): number {
  if (value > 0.25) {
    return 0.25;
  }
  if (value < -0.25) {
    return -0.25;
  }
  return Math.round(value * 1000) / 1000;
}

function normalizeId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getCoachesFromSeed(): CoachesSeedCoach[] {
  const seed = coachesSeed as CoachesSeedFile;
  return seed.coaches;
}

function scoreSchemeForSpacing(scheme: string): number {
  const normalized = scheme.toLowerCase();
  if (
    normalized.includes('spread') ||
    normalized.includes('five-out') ||
    normalized.includes('pace-space')
  ) {
    return 0.03;
  }
  if (normalized.includes('motion')) {
    return 0.015;
  }
  if (normalized.includes('drop')) {
    return -0.01;
  }
  return 0;
}

function scoreSchemeForDefense(scheme: string): number {
  const normalized = scheme.toLowerCase();
  if (
    normalized.includes('switch') ||
    normalized.includes('drop') ||
    normalized.includes('shell') ||
    normalized.includes('grit')
  ) {
    return 0.03;
  }
  if (normalized.includes('star-isolation')) {
    return -0.02;
  }
  return 0;
}

export interface CoachValuationInputs {
  pace: number;
  spacing: number;
  rim_pressure: number;
  defense: number;
  development: number;
}

export function listCoachProfiles(): OffseasonCoachProfile[] {
  return getCoachesFromSeed()
    .map((coach) => ({
      id: `${coach.teamAbbreviation.toLowerCase()}-${normalizeId(
        coach.headCoachName
      )}`,
      team_abbreviation: coach.teamAbbreviation,
      head_coach_name: coach.headCoachName,
      pace: coach.pace,
      scheme: coach.scheme,
      youth_development: coach.youthDevelopment,
      driver_friendly: coach.driverFriendly,
      shooter_friendly: coach.shooterFriendly,
    }))
    .sort((a, b) => a.head_coach_name.localeCompare(b.head_coach_name));
}

export function findCoachProfileById(
  coachId: string
): OffseasonCoachProfile | null {
  return listCoachProfiles().find((coach) => coach.id === coachId) ?? null;
}

export function buildCoachTendencyProfile(
  coach: OffseasonCoachProfile
): OffseasonCoachTendencyProfile {
  const spacingBase = coach.shooter_friendly ? 0.06 : -0.04;
  const rimPressureBase = coach.driver_friendly ? 0.06 : -0.03;
  const developmentBase = coach.youth_development ? 0.07 : -0.04;

  return {
    pace_bias: clampBias(PACE_BIAS[coach.pace]),
    spacing_bias: clampBias(spacingBase + scoreSchemeForSpacing(coach.scheme)),
    rim_pressure_bias: clampBias(rimPressureBase),
    defense_bias: clampBias(scoreSchemeForDefense(coach.scheme)),
    development_bias: clampBias(developmentBase),
  };
}

export function buildCoachHiringNotes(
  coach: OffseasonCoachProfile,
  tendencyProfile: OffseasonCoachTendencyProfile
): string[] {
  const notes = [
    `${coach.head_coach_name} installs a ${coach.scheme} identity with ${coach.pace} pace pressure.`,
  ];

  if (tendencyProfile.spacing_bias >= 0.05) {
    notes.push('Prioritize lineup combinations that keep shooting gravity on the floor.');
  } else if (tendencyProfile.spacing_bias <= -0.03) {
    notes.push('Spacing gains are limited, so secondary playmaking carries more weight.');
  }

  if (tendencyProfile.rim_pressure_bias >= 0.05) {
    notes.push('Driver development and downhill creation receive positive grading boosts.');
  } else {
    notes.push('Rim-pressure outcomes are harder to bank on under this coaching profile.');
  }

  if (tendencyProfile.development_bias >= 0.05) {
    notes.push('Long-term developmental upside is weighted more heavily than immediate floor.');
  } else {
    notes.push('Rotation readiness is weighted more heavily than long-range upside.');
  }

  return notes;
}

export function applyTendencyToValuation(
  base: CoachValuationInputs,
  tendencyProfile: OffseasonCoachTendencyProfile
): CoachValuationInputs {
  return {
    pace: clampBias(base.pace + tendencyProfile.pace_bias),
    spacing: clampBias(base.spacing + tendencyProfile.spacing_bias),
    rim_pressure: clampBias(
      base.rim_pressure + tendencyProfile.rim_pressure_bias
    ),
    defense: clampBias(base.defense + tendencyProfile.defense_bias),
    development: clampBias(base.development + tendencyProfile.development_bias),
  };
}

