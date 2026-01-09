/**
 * TeamAnalysis.tsx - COMPLETE REWRITE V3
 * 
 * Uses actual player feature values, not archetype percentages
 */

import React from 'react';
import { TeamAggregation } from '@nba-draft-sim/shared';

interface TeamAnalysisProps {
  aggregation: TeamAggregation;
}

export const TeamAnalysis: React.FC<TeamAnalysisProps> = ({ aggregation }) => {
  const f = aggregation.features;
  const arch = aggregation.archetypes;
  const mods = aggregation.modifiers;

  // Calculate trait scores using ACTUAL FEATURE VALUES
  // AST per 36 ranges from ~2-10 for good players
  // TS% ranges from 0.50-0.70
  // BLK/STL per 36 ranges from 0.5-3
  
  const playmaking = Math.min(100, Math.max(0,
    ((f.AST ?? 0) * 12) +        // 6 AST/36 = 72
    ((f.PAR ?? 0.5) * 25)        // 0.7 PAR = 17.5
  ));

  const shooting = Math.min(100, Math.max(0,
    (((f.TS ?? 0.5) - 0.45) * 350) +     // 0.67 TS = 77
    (((f.THREE_P_PCT ?? 0.3) - 0.25) * 150)  // 0.38 3P% = 19.5
  ));

  const rimProtection = Math.min(100, Math.max(0,
    ((f.BLK ?? 0) * 40) +        // 2 BLK = 80
    ((f.BLK_RATE ?? 0) * 10)
  ));

  const perimeterDefense = Math.min(100, Math.max(0,
    ((f.STL ?? 0) * 40) +        // 2 STL = 80
    ((f.DEFLECTIONS ?? 0) * 3)
  ));

  const rebounding = Math.min(100, Math.max(0,
    ((f.OREB_PCT ?? 0) * 300) +  // 0.10 = 30
    ((f.DREB_PCT ?? 0) * 200) +  // 0.25 = 50
    ((f.REB_TOTAL ?? 0) * 2)     // 8 = 16
  ));

  const getTier = (score: number) => {
    if (score >= 70) return { tier: 'Elite', bg: 'bg-purple-900', text: 'text-purple-300', bar: 'bg-purple-500' };
    if (score >= 55) return { tier: 'Great', bg: 'bg-blue-900', text: 'text-blue-300', bar: 'bg-blue-500' };
    if (score >= 40) return { tier: 'Good', bg: 'bg-green-900', text: 'text-green-300', bar: 'bg-green-500' };
    if (score >= 25) return { tier: 'Avg', bg: 'bg-yellow-900', text: 'text-yellow-300', bar: 'bg-yellow-500' };
    return { tier: 'Poor', bg: 'bg-red-900', text: 'text-red-300', bar: 'bg-red-500' };
  };

  const traits = [
    { name: 'Playmaking', score: playmaking },
    { name: 'Shooting', score: shooting },
    { name: 'Rim Protection', score: rimProtection },
    { name: 'Perimeter D', score: perimeterDefense },
    { name: 'Rebounding', score: rebounding },
  ];

  // Get team identity from top archetype
  const topArchetypes = Object.entries(arch)
    .filter(([_, v]) => v !== undefined && v > 0.08)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0));

  const identityMap: Record<string, string> = {
    PrimaryCreator: 'Creator-Led',
    SecondaryPlaymaker: 'Ball Movement',
    VolumeSniper: 'Volume Shooting',
    EfficientSpacer: 'Floor Spacing',
    ShotMaker: 'Shot Creation',
    AdvantageDriver: 'Drive & Kick',
    Connector: 'Motion Offense',
    PointOfAttackMenace: 'Perimeter Lock',
    Disruptor: 'Disruptive D',
    RimDeterrent: 'Paint Protection',
    ReboundEnforcer: 'Glass Control',
    HustleEngine: 'Hustle Squad',
    WinDriver: 'Winning Culture',
  };

  const identity = topArchetypes.length > 0 
    ? (identityMap[topArchetypes[0][0]] || 'Balanced')
    : 'Balanced';

  // Composition effects
  const effects: { label: string; positive: boolean }[] = [];
  if ((mods.shootBonus ?? 0) > 0.01) effects.push({ label: 'Spacing Bonus', positive: true });
  if ((mods.creatorPen ?? 0) < -0.01) effects.push({ label: 'Creator Redundancy', positive: false });
  if ((mods.rimPen ?? 0) < -0.01) effects.push({ label: 'Rim Vulnerability', positive: false });
  if ((mods.variancePenalty ?? 0) > 0.02) effects.push({ label: 'High Variance', positive: false });

  return (
    <div className="space-y-4">
      {/* Team Identity */}
      <div>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Team Identity
        </div>
        <div className="text-xl font-bold text-white">
          {identity}
        </div>
      </div>

      {/* Trait Bars */}
      <div>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Team Analysis
        </div>
        <div className="space-y-3">
          {traits.map(trait => {
            const t = getTier(trait.score);
            return (
              <div key={trait.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-300">{trait.name}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${t.bg} ${t.text}`}>
                    {t.tier}
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${t.bar}`}
                    style={{ width: `${Math.max(5, trait.score)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Composition Effects */}
      {effects.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Composition
          </div>
          <div className="flex flex-wrap gap-2">
            {effects.map((e, i) => (
              <span 
                key={i} 
                className={`text-xs px-2 py-1 rounded ${
                  e.positive 
                    ? 'bg-green-900/50 text-green-400' 
                    : 'bg-red-900/50 text-red-400'
                }`}
              >
                {e.positive ? '↑' : '↓'} {e.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Overall Rating */}
      <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
        <span className="text-gray-400">Overall Rating</span>
        <span className="text-2xl font-bold text-white">
          {aggregation.overallRating.toFixed(1)}
        </span>
      </div>
    </div>
  );
};