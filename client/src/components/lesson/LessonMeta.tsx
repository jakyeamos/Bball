import React from 'react';
import { Difficulty, InteractionType, RoleLens } from '@nba-draft-sim/shared';

interface LessonMetaProps {
  roleLens: RoleLens;
  difficulty: Difficulty;
  interactionType?: InteractionType;
}

export function LessonMeta({ roleLens, difficulty, interactionType }: LessonMetaProps) {
  const roleLabels: Record<RoleLens, string> = { player: 'Player IQ', coach: 'Coach IQ', gm: 'GM IQ' };
  const diffLabels: Record<Difficulty, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
  const interactionLabel =
    interactionType === 'pause_predict'
      ? 'Pause & Predict'
      : interactionType === 'scenario'
      ? 'Scenario'
      : interactionType
      ? interactionType.charAt(0).toUpperCase() + interactionType.slice(1)
      : null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-widest text-cv-accent">
        {roleLabels[roleLens]}
      </span>
      <span className="text-cv-chalk/40 text-xs">•</span>
      <span className="text-xs text-cv-chalk/50">
        {diffLabels[difficulty]}
      </span>
      {interactionLabel && (
        <>
          <span className="text-cv-chalk/40 text-xs">•</span>
          <span className="text-xs capitalize text-cv-chalk/50 border border-cv-chalk/20 px-2 py-0.5 rounded-full">
            {interactionLabel}
          </span>
        </>
      )}
    </div>
  );
}
