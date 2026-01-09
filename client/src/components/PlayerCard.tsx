import React from 'react';
import { Player, TeamAggregation } from '@nba-draft-sim/shared';
import { getTopArchetypes, getArchetypeColor, formatArchetypeName } from '../archetypes';

/**
 * PlayerCard Component - Redesigned
 * Inspired by The Ringer's player card layout
 */

// Position badge colors
const getPositionColor = (position: string): string => {
  switch (position) {
    case 'PG':
    case 'SG':
      return 'bg-blue-600';
    case 'SF':
      return 'bg-green-600';
    case 'PF':
    case 'C':
      return 'bg-orange-600';
    default:
      return 'bg-gray-600';
  }
};

// Synergy calculation
type SynergyLevel = 'great' | 'good' | 'average' | 'poor';

const getSynergy = (player: Player, teamAggregation?: TeamAggregation): SynergyLevel => {
  if (!teamAggregation) return 'average';

  const teamArchetypes = teamAggregation.archetypes;
  const playerArchetypes = player.archetypes;

  let synergyScore = 0;
  let totalWeight = 0;

  for (const archetype in teamArchetypes) {
    const teamValue = teamArchetypes[archetype] ?? 0;
    if (teamValue > 0) {
      const playerValue = playerArchetypes[archetype] ?? 0;
      synergyScore += playerValue * teamValue;
      totalWeight += teamValue;
    }
  }

  if (totalWeight === 0) return 'average';

  const finalScore = synergyScore / totalWeight;

  if (finalScore > 0.6) return 'great';
  if (finalScore > 0.35) return 'good';
  if (finalScore > 0.15) return 'average';
  return 'poor';
};

const getSynergyBadge = (synergy: SynergyLevel): { emoji: string; label: string; color: string } => {
  switch (synergy) {
    case 'great':
      return { emoji: '🔥', label: 'Perfect Fit', color: 'text-green-600' };
    case 'good':
      return { emoji: '✓', label: 'Good Fit', color: 'text-blue-600' };
    case 'poor':
      return { emoji: '⚠', label: 'Poor Fit', color: 'text-orange-600' };
    default:
      return { emoji: '', label: '', color: '' };
  }
};

interface PlayerCardProps {
  player: Player;
  playerIndex: number;
  teamAggregation?: TeamAggregation;
  compact?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ 
  player, 
  playerIndex, 
  teamAggregation,
  compact = false 
}) => {
  const ppg = player.rawStats.PTS / player.rawStats.GP;
  const rpg = player.rawStats.REB / player.rawStats.GP;
  const apg = player.rawStats.AST / player.rawStats.GP;
  const topArchetypes = getTopArchetypes(player.archetypes, 2);
  const synergy = getSynergy(player, teamAggregation);
  const synergyInfo = getSynergyBadge(synergy);

  if (compact) {
    // Compact view for smaller spaces
    return (
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
        {/* Rank Badge */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
          <span className="text-white font-bold text-sm">{playerIndex + 1}</span>
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 truncate">{player.name}</span>
            {synergy !== 'average' && (
              <span className={`text-xs ${synergyInfo.color}`}>{synergyInfo.emoji}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className={`px-1.5 py-0.5 rounded text-white text-[10px] font-bold ${getPositionColor(player.position)}`}>
              {player.position}
            </span>
            <span>{player.team}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-shrink-0 text-right">
          <div className="font-bold text-gray-900">{ppg.toFixed(1)}</div>
          <div className="text-xs text-gray-500">PPG</div>
        </div>
      </div>
    );
  }

  // Full card view
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* Header with rank and position */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-900">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-white">{String(playerIndex + 1).padStart(2, '0')}</span>
          <div className="h-8 w-px bg-gray-600"></div>
          <span className={`px-2 py-1 rounded text-white text-xs font-bold ${getPositionColor(player.position)}`}>
            {player.position}
          </span>
        </div>
        {synergy !== 'average' && (
          <span className={`text-xs font-medium ${synergy === 'great' ? 'text-green-400' : synergy === 'good' ? 'text-blue-400' : 'text-orange-400'}`}>
            {synergyInfo.emoji} {synergyInfo.label}
          </span>
        )}
      </div>

      {/* Player Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-black text-gray-900 leading-tight">{player.name}</h3>
            <p className="text-sm text-gray-500">{player.team}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-gray-900">{ppg.toFixed(1)}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">PPG</div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mb-3 pb-3 border-b border-gray-100">
          <div className="flex-1 text-center">
            <div className="text-lg font-bold text-gray-800">{rpg.toFixed(1)}</div>
            <div className="text-xs text-gray-500 uppercase">RPG</div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-lg font-bold text-gray-800">{apg.toFixed(1)}</div>
            <div className="text-xs text-gray-500 uppercase">APG</div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-lg font-bold text-gray-800">{(player.rawStats.TS_PCT * 100).toFixed(0)}%</div>
            <div className="text-xs text-gray-500 uppercase">TS%</div>
          </div>
        </div>

        {/* Archetypes */}
        {topArchetypes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {topArchetypes.map((arch, index) => (
              <span
                key={arch.name}
                className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg border ${getArchetypeColor(arch.name)}`}
              >
                {formatArchetypeName(arch.name)}
                {index === 0 && (
                  <span className="ml-1 opacity-60">({(arch.percentage * 100).toFixed(0)}%)</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Export a simpler list item version for dense lists
export const PlayerListItem: React.FC<PlayerCardProps> = ({ 
  player, 
  playerIndex, 
  teamAggregation 
}) => {
  const ppg = player.rawStats.PTS / player.rawStats.GP;
  const rpg = player.rawStats.REB / player.rawStats.GP;
  const apg = player.rawStats.AST / player.rawStats.GP;
  const topArch = getTopArchetypes(player.archetypes, 1)[0];
  const synergy = getSynergy(player, teamAggregation);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-gray-800 text-white text-xs font-bold flex items-center justify-center">
            {playerIndex + 1}
          </span>
          <div>
            <div className="font-semibold text-gray-900">{player.name}</div>
            <div className="text-xs text-gray-500">{player.position} • {player.team}</div>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        {topArch && (
          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${getArchetypeColor(topArch.name)}`}>
            {formatArchetypeName(topArch.name)}
          </span>
        )}
      </td>
      <td className="py-3 px-4 text-right font-semibold">{ppg.toFixed(1)}</td>
      <td className="py-3 px-4 text-right">{rpg.toFixed(1)}</td>
      <td className="py-3 px-4 text-right">{apg.toFixed(1)}</td>
      <td className="py-3 px-4 text-center">
        {synergy === 'great' && <span className="text-green-500">🔥</span>}
        {synergy === 'good' && <span className="text-blue-500">✓</span>}
        {synergy === 'poor' && <span className="text-orange-500">⚠</span>}
      </td>
    </tr>
  );
};