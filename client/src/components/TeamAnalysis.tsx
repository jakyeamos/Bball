import React from 'react';
import { TeamAggregation } from '@nba-draft-sim/shared';
import { getPrimaryTeamIdentity } from '../archetypes';

interface TraitBarProps {
  label: string;
  score: number;
  tier: 'elite' | 'great' | 'good' | 'average' | 'poor';
}

const tierColors = {
  elite: 'bg-purple-500',
  great: 'bg-blue-500',
  good: 'bg-green-500',
  average: 'bg-yellow-500',
  poor: 'bg-red-500',
};

const TraitBar: React.FC<TraitBarProps> = ({ label, score, tier }) => (
  <div className="mb-2">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <span className="text-xs font-bold text-gray-800">{score.toFixed(
        1
      )}</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full ${tierColors[tier]}`}
        style={{ width: `${score}%` }}
      />
    </div>
  </div>
);

interface TeamNarrativeProps {
  aggregation: TeamAggregation;
}

const TeamNarrative: React.FC<TeamNarrativeProps> = ({ aggregation }) => {
  const getTeamNarrative = () => {
    const primary = getPrimaryTeamIdentity(aggregation);
    switch (primary) {
      case 'PrimaryCreator':
        return 'This team wants to build its offense around a primary ball-handler.';
      case 'OffBallShooter':
        return 'This team wants to win with shooting and spacing.';
      case 'RimProtector':
        return 'This team wants to dominate the paint and protect the rim.';
      default:
        return 'This team has a balanced identity.';
    }
  };

  return (
    <div className="p-4 bg-gray-50 border-b border-gray-200">
      <h4 className="text-sm font-bold text-gray-700 mb-2">Team Narrative</h4>
      <p className="text-xs text-gray-600">{getTeamNarrative()}</p>
    </div>
  );
};

interface TeamAnalysisProps {
  aggregation: TeamAggregation;
}

export const TeamAnalysis: React.FC<TeamAnalysisProps> = ({ aggregation }) => {
  const getTier = (
    score: number
  ): 'elite' | 'great' | 'good' | 'average' | 'poor' => {
    if (score >= 90) return 'elite';
    if (score >= 75) return 'great';
    if (score >= 60) return 'good';
    if (score >= 40) return 'average';
    return 'poor';
  };

  return (
    <>
      <TeamNarrative aggregation={aggregation} />
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h4 className="text-sm font-bold text-gray-700 mb-3">
          Team Analysis
        </h4>
        <TraitBar
          label="Ball Handling"
          score={aggregation.archetypes.PrimaryCreator || 0}
          tier={getTier(aggregation.archetypes.PrimaryCreator || 0)}
        />
        <TraitBar
          label="Shooting"
          score={aggregation.archetypes.OffBallShooter || 0}
          tier={getTier(aggregation.archetypes.OffBallShooter || 0)}
        />
        <TraitBar
          label="Rim Protection"
          score={aggregation.archetypes.RimProtector || 0}
          tier={getTier(aggregation.archetypes.RimProtector || 0)}
        />
      </div>
    </>
  );
};
