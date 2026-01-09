import React from 'react';
import { TeamAggregation } from '@nba-draft-sim/shared';

/**
 * TeamAnalysis Component - Phase 2 Updated
 * Uses correct archetype names and better trait aggregation
 */

interface TraitBarProps {
  label: string;
  value: number; // 0-100 scale
  description?: string;
}

const getTierInfo = (value: number): { tier: string; color: string; bgColor: string } => {
  if (value >= 80) return { tier: 'Elite', color: 'text-purple-400', bgColor: 'bg-purple-500' };
  if (value >= 65) return { tier: 'Great', color: 'text-blue-400', bgColor: 'bg-blue-500' };
  if (value >= 50) return { tier: 'Good', color: 'text-green-400', bgColor: 'bg-green-500' };
  if (value >= 35) return { tier: 'Average', color: 'text-yellow-400', bgColor: 'bg-yellow-500' };
  return { tier: 'Poor', color: 'text-red-400', bgColor: 'bg-red-500' };
};

const TraitBar: React.FC<TraitBarProps> = ({ label, value, description }) => {
  const { tier, color, bgColor } = getTierInfo(value);
  
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{label}</span>
          <span className={`text-xs font-medium ${color}`}>{tier}</span>
        </div>
        <span className="text-sm font-bold text-gray-800">{value.toFixed(0)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${bgColor}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </div>
  );
};

interface TeamAnalysisProps {
  aggregation: TeamAggregation;
}

export const TeamAnalysis: React.FC<TeamAnalysisProps> = ({ aggregation }) => {
  const arch = aggregation.archetypes;
  const feat = aggregation.features;

  // Calculate trait scores (0-100 scale) using Phase 2 archetypes
  // Ball Handling / Playmaking: PrimaryCreator + SecondaryPlaymaker + Connector
  const ballHandling = (
    ((arch.PrimaryCreator ?? 0) * 1.2) +
    ((arch.SecondaryPlaymaker ?? 0) * 1.0) +
    ((arch.Connector ?? 0) * 0.8)
  ) * 100 / 3;

  // Shooting / Spacing: VolumeSniper + EfficientSpacer + ShotMaker
  const shooting = (
    ((arch.VolumeSniper ?? 0) * 1.0) +
    ((arch.EfficientSpacer ?? 0) * 1.2) +
    ((arch.ShotMaker ?? 0) * 0.8)
  ) * 100 / 3;

  // Rim Protection / Interior Defense: RimDeterrent + ReboundEnforcer
  const rimProtection = (
    ((arch.RimDeterrent ?? 0) * 1.5) +
    ((arch.ReboundEnforcer ?? 0) * 0.5)
  ) * 100 / 2;

  // Perimeter Defense: PointOfAttackMenace + Disruptor
  const perimeterDefense = (
    ((arch.PointOfAttackMenace ?? 0) * 1.2) +
    ((arch.Disruptor ?? 0) * 0.8)
  ) * 100 / 2;

  // Athleticism / Hustle: HustleEngine + AdvantageDriver
  const athleticism = (
    ((arch.HustleEngine ?? 0) * 1.0) +
    ((arch.AdvantageDriver ?? 0) * 1.0)
  ) * 100 / 2;

  // Get team narrative based on strongest traits
  const getTeamNarrative = (): string => {
    const traits = [
      { name: 'playmaking', value: ballHandling },
      { name: 'shooting', value: shooting },
      { name: 'rim protection', value: rimProtection },
      { name: 'perimeter defense', value: perimeterDefense },
      { name: 'athleticism', value: athleticism },
    ];

    const sorted = traits.sort((a, b) => b.value - a.value);
    const strongest = sorted[0];
    const secondStrong = sorted[1];

    if (strongest.value >= 60) {
      if (strongest.name === 'playmaking') {
        return 'This team thrives on ball movement and creative playmaking.';
      } else if (strongest.name === 'shooting') {
        return 'This team stretches the floor with elite spacing and shooting.';
      } else if (strongest.name === 'rim protection') {
        return 'This team dominates the paint with imposing rim protection.';
      } else if (strongest.name === 'perimeter defense') {
        return 'This team locks down opponents on the perimeter.';
      } else if (strongest.name === 'athleticism') {
        return 'This team outworks opponents with relentless energy and athleticism.';
      }
    }

    if (strongest.value >= 45 && secondStrong.value >= 40) {
      return `This team balances ${strongest.name} with solid ${secondStrong.name}.`;
    }

    return 'This team is still developing its identity.';
  };

  return (
    <div className="border-b border-gray-200">
      {/* Team Narrative */}
      <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <h4 className="text-sm font-bold text-gray-700 mb-1">Team Identity</h4>
        <p className="text-sm text-gray-600 italic">{getTeamNarrative()}</p>
      </div>

      {/* Team Analysis Bars */}
      <div className="p-4 bg-white">
        <h4 className="text-sm font-bold text-gray-700 mb-4">Team Analysis</h4>
        
        <TraitBar 
          label="Playmaking" 
          value={ballHandling} 
        />
        <TraitBar 
          label="Shooting" 
          value={shooting} 
        />
        <TraitBar 
          label="Rim Protection" 
          value={rimProtection} 
        />
        <TraitBar 
          label="Perimeter Defense" 
          value={perimeterDefense} 
        />
        <TraitBar 
          label="Athleticism" 
          value={athleticism} 
        />
      </div>

      {/* Team Modifiers Summary */}
      {aggregation.modifiers && (
        <div className="px-4 pb-4 bg-white">
          <div className="flex flex-wrap gap-2">
            {aggregation.modifiers.shootBonus > 0.01 && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                📈 Spacing Bonus
              </span>
            )}
            {aggregation.modifiers.creatorPen < -0.01 && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                ⚠️ Creator Redundancy
              </span>
            )}
            {aggregation.modifiers.rimPen < -0.01 && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                🚨 No Rim Protection
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};