/**
 * Archetype Utilities
 * Helper functions for displaying archetypes and analyzing team composition
 */

import { ArchetypeProfile, Player } from '@nba-draft-sim/shared';

export interface TopArchetype {
  name: string;
  percentage: number;
}

export interface TeamComposition {
  creators: number;
  shooting: number;
  rimProtection: number;
  defense: number;
  hasCreatorPenalty: boolean;
  hasShootingBonus: boolean;
  hasRimProtectionPenalty: boolean;
}

/**
 * Get top N archetypes for a player
 */
export function getTopArchetypes(archetypes: ArchetypeProfile, count: number = 3): TopArchetype[] {
  const entries = Object.entries(archetypes)
    .map(([name, percentage]) => ({ name, percentage }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, count);

  return entries;
}

/**
 * Get color for archetype category
 */
export function getArchetypeColor(archetypeName: string): string {
  // Offensive archetypes - blue shades
  const offensive = [
    'PrimaryCreator',
    'SecondaryCreator',
    'Connector',
    'OffBallShooter',
    'MovementShooter',
    'Slasher',
    'PostScorer',
    'PlaymakingBig',
  ];

  // Defensive archetypes - red shades
  const defensive = [
    'POAStopper',
    'HelpDefender',
    'RimProtector',
    'DefAnchor',
    'DefPlaymaker',
  ];

  // Hybrid/versatile archetypes - green/purple shades
  const hybrid = [
    'ThreeAndD',
    'StretchBig',
    'VerticalRoller',
    'Rebounder',
    'UtilityWing',
  ];

  if (offensive.includes(archetypeName)) {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  } else if (defensive.includes(archetypeName)) {
    return 'bg-red-100 text-red-800 border-red-200';
  } else if (hybrid.includes(archetypeName)) {
    return 'bg-green-100 text-green-800 border-green-200';
  }

  return 'bg-gray-100 text-gray-800 border-gray-200';
}

/**
 * Format archetype name for display (remove camelCase)
 */
export function formatArchetypeName(name: string): string {
  // Insert space before capitals
  return name.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Calculate team composition percentages
 */
export function calculateTeamComposition(players: Player[]): TeamComposition {
  if (players.length === 0) {
    return {
      creators: 0,
      shooting: 0,
      rimProtection: 0,
      defense: 0,
      hasCreatorPenalty: false,
      hasShootingBonus: false,
      hasRimProtectionPenalty: false,
    };
  }

  // Calculate weighted average of archetypes
  const totalImpact = players.reduce((sum, p) => sum + p.impactRating, 0);

  let creators = 0;
  let shooting = 0;
  let rimProtection = 0;
  let defense = 0;

  players.forEach(player => {
    const weight = player.impactRating / totalImpact;

    // Creators: PrimaryCreator + SecondaryCreator
    creators += (player.archetypes.PrimaryCreator + player.archetypes.SecondaryCreator) * weight;

    // Shooting: OffBallShooter + MovementShooter
    shooting += (player.archetypes.OffBallShooter + player.archetypes.MovementShooter) * weight;

    // Rim Protection: RimProtector + DefAnchor
    rimProtection += (player.archetypes.RimProtector + player.archetypes.DefAnchor) * weight;

    // General Defense: All defensive archetypes
    defense += (
      player.archetypes.POAStopper +
      player.archetypes.HelpDefender +
      player.archetypes.RimProtector +
      player.archetypes.DefAnchor +
      player.archetypes.DefPlaymaker
    ) * weight;
  });

  // Apply thresholds from anti-domination system
  const hasCreatorPenalty = creators > 30;
  const hasShootingBonus = shooting > 15;
  const hasRimProtectionPenalty = rimProtection < 10;

  return {
    creators,
    shooting,
    rimProtection,
    defense,
    hasCreatorPenalty,
    hasShootingBonus,
    hasRimProtectionPenalty,
  };
}

/**
 * Get composition status (good/warning/danger)
 */
export function getCompositionStatus(
  value: number,
  type: 'creators' | 'shooting' | 'rimProtection'
): 'good' | 'warning' | 'danger' {
  switch (type) {
    case 'creators':
      if (value > 40) return 'danger';
      if (value > 30) return 'warning';
      return 'good';

    case 'shooting':
      if (value > 25) return 'good';
      if (value > 15) return 'warning';
      return 'danger';

    case 'rimProtection':
      if (value < 5) return 'danger';
      if (value < 10) return 'warning';
      return 'good';

    default:
      return 'good';
  }
}

/**
 * Get status color classes
 */
export function getStatusColor(status: 'good' | 'warning' | 'danger'): string {
  switch (status) {
    case 'good':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'warning':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'danger':
      return 'text-red-600 bg-red-50 border-red-200';
  }
}

/**
 * Get composition message
 */
export function getCompositionMessage(
  type: 'creators' | 'shooting' | 'rimProtection',
  value: number,
  hasPenalty: boolean,
  hasBonus: boolean
): string {
  switch (type) {
    case 'creators':
      if (hasPenalty) {
        return '⚠️ Creator penalty active! Too many ball-dominant players.';
      }
      if (value > 25) {
        return '⚠️ High creator percentage. Consider balance.';
      }
      return '✅ Balanced creator distribution.';

    case 'shooting':
      if (hasBonus) {
        return '✨ Spacing bonus active! Great shooting team.';
      }
      if (value < 15) {
        return '⚠️ Low shooting. May struggle with spacing.';
      }
      return '✅ Decent shooting distribution.';

    case 'rimProtection':
      if (hasPenalty) {
        return '⚠️ Rim protection penalty! Vulnerable inside.';
      }
      if (value < 10) {
        return '⚠️ Low rim protection. Consider adding a big.';
      }
      return '✅ Solid rim protection.';

    default:
      return '';
  }
}
