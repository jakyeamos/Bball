import React from 'react';
import { Player, TeamAggregation } from '@nba-draft-sim/shared';
import { getTopArchetypes, getArchetypeColor, formatArchetypeName } from '../archetypes';

// Synergy Components & Logic (Moved from DraftRecapPage)
type SynergyLevel = 'great' | 'good' | 'poor' | 'average';

interface SynergyMarkProps {
  synergy: SynergyLevel;
}

const SynergyMark: React.FC<SynergyMarkProps> = ({ synergy }) => {
  const synergyStyles: Record<SynergyLevel, string> = {
    great: 'bg-green-500',
    good: 'bg-blue-500',
    poor: 'bg-red-500',
    average: 'bg-gray-400',
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${synergyStyles[synergy]}`}
    ></span>
  );
};

const getSynergy = (player: Player, teamAggregation?: TeamAggregation): SynergyLevel => {
  if (!teamAggregation) return 'average';

  const teamArchetypes = teamAggregation.archetypes;
  const playerArchetypes = player.archetypes;

  let synergyScore = 0;
  let totalWeight = 0;

  for (const archetype in teamArchetypes) {
    if (teamArchetypes[archetype] > 0) {
      const weight = teamArchetypes[archetype];
      const playerValue = playerArchetypes[archetype] ?? 0;
      synergyScore += playerValue * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return 'average';

  const finalScore = synergyScore / totalWeight;

  if (finalScore > 0.6) return 'great';
  if (finalScore > 0.35) return 'good';
  if (finalScore > 0.15) return 'average';
  return 'poor';
};


interface PlayerCardProps {
  player: Player;
  playerIndex: number;
  teamAggregation: TeamAggregation | undefined;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, playerIndex, teamAggregation }) => {
  const ppg = player.rawStats.PTS / player.rawStats.GP;
  const rpg = player.rawStats.REB / player.rawStats.GP;
  const apg = player.rawStats.AST / player.rawStats.GP;
  const topArch = getTopArchetypes(player.archetypes, 1)[0];
  const synergy = getSynergy(player, teamAggregation);

  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
              {playerIndex + 1}
            </span>
            <span className="font-bold text-sm text-gray-900 truncate">
              {player.name}
            </span>
            <SynergyMark synergy={synergy} />
          </div>
          <div className="text-xs text-gray-500 ml-8">
            {player.position} • {player.team}
          </div>
          {topArch && (
            <div className="ml-8 mt-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border ${getArchetypeColor(
                  topArch.name
                )}`}
              >
                {formatArchetypeName(topArch.name)}
              </span>
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-bold text-primary-600">
            {ppg.toFixed(1)} PPG
          </div>
          <div className="text-xs text-gray-600">
            {rpg.toFixed(1)} RPG
          </div>
          <div className="text-xs text-gray-600">
            {apg.toFixed(1)} APG
          </div>
        </div>
      </div>
    </div>
  );
};
