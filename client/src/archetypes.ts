/**
 * Archetype Utilities - TYPE-SAFE VERSION
 */

import { ArchetypeProfile } from '@nba-draft-sim/shared';

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
  // Creation & Offense: blue
  if (['PrimaryCreator', 'SecondaryPlaymaker', 'ShotMaker', 'AdvantageDriver', 'Connector'].includes(name)) {
    return 'bg-blue-100 text-blue-800 border-blue-300';
  }
  // Shooters (VolumeSniper, EfficientSpacer): purple
  if (['VolumeSniper', 'EfficientSpacer'].includes(name)) {
    return 'bg-purple-100 text-purple-800 border-purple-300';
  }
  // Defense (PointOfAttackMenace, Disruptor, RimDeterrent): red
  if (['PointOfAttackMenace', 'Disruptor', 'RimDeterrent'].includes(name)) {
    return 'bg-red-100 text-red-800 border-red-300';
  }
  // Activity (ReboundEnforcer, HustleEngine, WinDriver): green
  if (['ReboundEnforcer', 'HustleEngine', 'WinDriver'].includes(name)) {
    return 'bg-green-100 text-green-800 border-green-300';
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
