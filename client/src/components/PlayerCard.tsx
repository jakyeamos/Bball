/**
 * PlayerCard.tsx - V3 with Fit Indicator
 * 
 * Clean layout:
 * - Player name and team
 * - Stats inline: "31.9 PPG • 4.5 RPG • 6.4 APG"
 * - Fit indicator (Great/Good/Avg/Poor)
 * - Top 3 archetypes (no percentages)
 */

import React from 'react';
import { Player, TeamAggregation } from '@nba-draft-sim/shared';

interface PlayerCardProps {
  player: Player;
  teamAggregation?: TeamAggregation;
}

// Calculate player fit with team
type FitLevel = 'great' | 'good' | 'avg' | 'poor';

function calculateFit(player: Player, teamAgg?: TeamAggregation): FitLevel {
  if (!teamAgg) return 'avg';

  const teamArch = teamAgg.archetypes;
  const playerArch = player.archetypes;

  // Score based on how much player's archetypes align with team's top archetypes
  let score = 0;
  let totalWeight = 0;

  for (const [archetype, teamValue] of Object.entries(teamArch)) {
    if (teamValue && teamValue > 0.05) {
      const playerValue = playerArch[archetype] ?? 0;
      score += playerValue * teamValue;
      totalWeight += teamValue;
    }
  }

  const fitScore = totalWeight > 0 ? score / totalWeight : 0;

  if (fitScore > 0.25) return 'great';
  if (fitScore > 0.15) return 'good';
  if (fitScore > 0.08) return 'avg';
  return 'poor';
}

function getFitStyle(fit: FitLevel): { bg: string; text: string; label: string } {
  switch (fit) {
    case 'great':
      return { bg: 'bg-green-900/50', text: 'text-green-400', label: 'Great Fit' };
    case 'good':
      return { bg: 'bg-blue-900/50', text: 'text-blue-400', label: 'Good Fit' };
    case 'avg':
      return { bg: 'bg-yellow-900/50', text: 'text-yellow-400', label: 'Avg Fit' };
    case 'poor':
      return { bg: 'bg-red-900/50', text: 'text-red-400', label: 'Poor Fit' };
  }
}

// Format archetype name for display
function formatArchetype(name: string): string {
  const map: Record<string, string> = {
    PrimaryCreator: 'Primary Creator',
    SecondaryPlaymaker: 'Secondary Playmaker',
    VolumeSniper: 'Volume Sniper',
    EfficientSpacer: 'Efficient Spacer',
    ShotMaker: 'Shot Maker',
    AdvantageDriver: 'Advantage Driver',
    Connector: 'Connector',
    PointOfAttackMenace: 'POA Menace',
    Disruptor: 'Disruptor',
    RimDeterrent: 'Rim Deterrent',
    ReboundEnforcer: 'Rebound Enforcer',
    HustleEngine: 'Hustle Engine',
    WinDriver: 'Win Driver',
  };
  return map[name] || name.replace(/([A-Z])/g, ' $1').trim();
}

// Get archetype color
function getArchetypeColor(name: string): string {
  // Creation & Offense = blue
  if (['PrimaryCreator', 'SecondaryPlaymaker', 'ShotMaker', 'AdvantageDriver', 'Connector'].includes(name)) {
    return 'bg-blue-900/50 text-blue-300 border-blue-700';
  }
  // Shooters = purple
  if (['VolumeSniper', 'EfficientSpacer'].includes(name)) {
    return 'bg-purple-900/50 text-purple-300 border-purple-700';
  }
  // Defense = red
  if (['PointOfAttackMenace', 'Disruptor', 'RimDeterrent'].includes(name)) {
    return 'bg-red-900/50 text-red-300 border-red-700';
  }
  // Activity = green
  if (['ReboundEnforcer', 'HustleEngine', 'WinDriver'].includes(name)) {
    return 'bg-green-900/50 text-green-300 border-green-700';
  }
  return 'bg-gray-800 text-gray-300 border-gray-600';
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, teamAggregation }) => {
  const gp = Math.max(1, player.rawStats.GP);
  const ppg = (player.rawStats.PTS / gp).toFixed(1);
  const rpg = (player.rawStats.REB / gp).toFixed(1);
  const apg = (player.rawStats.AST / gp).toFixed(1);
  const ts = (player.rawStats.TS_PCT * 100).toFixed(0);

  // Calculate fit
  const fit = calculateFit(player, teamAggregation);
  const fitStyle = getFitStyle(fit);

  // Get top 3 archetypes (no percentages needed)
  const topArchetypes = Object.entries(player.archetypes)
    .filter(([_, v]) => v !== undefined && v > 0.05)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .slice(0, 3)
    .map(([name]) => name);

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      {/* Header: Name, Team, and Fit */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-lg font-bold text-white">{player.name}</div>
          <div className="text-sm text-gray-400">{player.team}</div>
        </div>
        {/* Fit Indicator */}
        <span className={`text-xs font-semibold px-2 py-1 rounded ${fitStyle.bg} ${fitStyle.text}`}>
          {fitStyle.label}
        </span>
      </div>

      {/* Stats - INLINE */}
      <div className="text-sm text-gray-300 mb-3">
        <span className="text-white font-semibold">{ppg}</span> PPG
        <span className="mx-2 text-gray-500">•</span>
        <span className="text-white font-semibold">{rpg}</span> RPG
        <span className="mx-2 text-gray-500">•</span>
        <span className="text-white font-semibold">{apg}</span> APG
        <span className="mx-2 text-gray-500">•</span>
        <span className="text-white font-semibold">{ts}%</span> TS
      </div>

      {/* Archetypes - just names, no percentages */}
      {topArchetypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {topArchetypes.map(arch => (
            <span 
              key={arch}
              className={`text-xs px-2 py-1 rounded border ${getArchetypeColor(arch)}`}
            >
              {formatArchetype(arch)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};