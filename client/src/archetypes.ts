/**
 * Archetype Utilities - TYPE-SAFE VERSION
 */

import { Player, ArchetypeProfile } from '@nba-draft-sim/shared';

/**
 * Add spaces to camelCase archetype names
 */
export function formatArchetypeName(name: string): string {
  const specialCases: Record<string, string> = {
    'ThreeAndD': '3&D',
    'POAStopper': 'POA Stopper',
    'DefAnchor': 'Def Anchor',
    'DefPlaymaker': 'Def Playmaker',
    'StretchBig': 'Stretch Big',
    'VerticalRoller': 'Vertical Roller',
    'UtilityWing': 'Utility Wing',
    'OffBallShooter': 'Off-Ball Shooter',
    'MovementShooter': 'Movement Shooter',
    'PostScorer': 'Post Scorer',
    'PlaymakingBig': 'Playmaking Big',
    'HelpDefender': 'Help Defender',
    'RimProtector': 'Rim Protector',
  };

  if (specialCases[name]) {
    return specialCases[name];
  }

  return name.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Get archetype color class
 */
export function getArchetypeColor(name: string): string {
  if (name.includes('Creator') || name.includes('Playmaking')) {
    return 'bg-blue-100 text-blue-800 border-blue-300';
  }
  if (name.includes('Shooter') || name.includes('Stretch') || name === 'ThreeAndD') {
    return 'bg-purple-100 text-purple-800 border-purple-300';
  }
  if (name.includes('Scorer') || name.includes('Slasher')) {
    return 'bg-indigo-100 text-indigo-800 border-indigo-300';
  }
  if (name.includes('Defender') || name.includes('Stopper') || name.includes('Anchor')) {
    return 'bg-red-100 text-red-800 border-red-300';
  }
  if (name.includes('Rim') || name.includes('Protector')) {
    return 'bg-orange-100 text-orange-800 border-orange-300';
  }
  if (name.includes('Utility') || name.includes('Connector') || name.includes('Roller')) {
    return 'bg-green-100 text-green-800 border-green-300';
  }
  if (name.includes('Rebounder')) {
    return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  }
  return 'bg-gray-100 text-gray-800 border-gray-300';
}

/**
 * Get top N archetypes sorted by percentage
 * FIXED: Handles ArchetypeProfile type properly
 */
export function getTopArchetypes(
  archetypes: ArchetypeProfile,
  count: number = 3
): Array<{ name: string; percentage: number }> {
  return Object.entries(archetypes)
    .filter(([_, percentage]) => percentage !== undefined && percentage > 0)
    .map(([name, percentage]) => ({ name, percentage: percentage as number }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, count);
}

/**
 * Calculate team composition from roster
 * FIXED: Handles optional archetype values
 */
export function calculateTeamComposition(roster: Player[]) {
  let creators = 0;
  let shooting = 0;
  let rimProtection = 0;

  roster.forEach(player => {
    // Ball handlers (creators)
    const creatorTypes = ['PrimaryCreator', 'SecondaryCreator', 'Connector', 'PlaymakingBig'];
    creatorTypes.forEach(type => {
      const value = player.archetypes[type as keyof ArchetypeProfile];
      if (value) creators += value;
    });

    // Shooters
    const shooterTypes = ['ThreeAndD', 'OffBallShooter', 'MovementShooter', 'StretchBig'];
    shooterTypes.forEach(type => {
      const value = player.archetypes[type as keyof ArchetypeProfile];
      if (value) shooting += value;
    });

    // Rim protection
    const rimTypes = ['RimProtector', 'DefAnchor', 'VerticalRoller'];
    rimTypes.forEach(type => {
      const value = player.archetypes[type as keyof ArchetypeProfile];
      if (value) rimProtection += value;
    });
  });

  const totalPlayers = roster.length;
  
  // Values are 0-1, multiply by 100 for percentage
  const creatorsPercent = (creators / totalPlayers) * 100;
  const shootingPercent = (shooting / totalPlayers) * 100;
  const rimProtectionPercent = (rimProtection / totalPlayers) * 100;

  return {
    creators: creatorsPercent,
    shooting: shootingPercent,
    rimProtection: rimProtectionPercent,
    hasCreatorPenalty: creatorsPercent < 15,
    hasShootingBonus: shootingPercent > 40,
    hasRimProtectionPenalty: rimProtectionPercent < 10,
  };
}

/**
 * Get composition status
 */
export function getCompositionStatus(
  value: number,
  type: 'creators' | 'shooting' | 'rimProtection'
): 'good' | 'warning' | 'danger' {
  if (type === 'creators') {
    if (value >= 25) return 'good';
    if (value >= 15) return 'warning';
    return 'danger';
  }
  if (type === 'shooting') {
    if (value >= 40) return 'good';
    if (value >= 25) return 'warning';
    return 'danger';
  }
  if (type === 'rimProtection') {
    if (value >= 15) return 'good';
    if (value >= 10) return 'warning';
    return 'danger';
  }
  return 'warning';
}

/**
 * Get status color classes
 */
export function getStatusColor(status: 'good' | 'warning' | 'danger'): string {
  if (status === 'good') return 'bg-green-100 text-green-800 border-green-300';
  if (status === 'warning') return 'bg-orange-100 text-orange-800 border-orange-300';
  return 'bg-red-100 text-red-800 border-red-300';
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
  if (type === 'creators') {
    if (value >= 25) return 'Strong ball handling';
    if (value >= 15) return 'Adequate playmaking';
    return 'Needs more ball handlers';
  }
  if (type === 'shooting') {
    if (hasBonus) return 'Elite spacing!';
    if (value >= 25) return 'Good spacing';
    return 'Needs more shooting';
  }
  if (type === 'rimProtection') {
    if (value >= 15) return 'Strong rim protection';
    if (value >= 10) return 'Adequate rim protection';
    return 'Vulnerable at rim';
  }
  return '';
}