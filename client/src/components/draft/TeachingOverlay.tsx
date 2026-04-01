import React from 'react';
import { DraftTeachingMoment as DraftTeachingMomentType } from '@nba-draft-sim/shared';
import { DraftTeachingMoment } from './DraftTeachingMoment';

interface TeachingOverlayProps {
  moment: DraftTeachingMomentType | null;
  onDismiss: () => void;
}

export function TeachingOverlay({ moment, onDismiss }: TeachingOverlayProps) {
  if (!moment) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-md rounded-[1rem] border border-cv-court/30 bg-cv-steel/95 p-4 shadow-2xl backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-cv-accent">Draft Teaching Moment</p>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-semibold text-cv-chalk/60 hover:text-cv-chalk"
        >
          Dismiss
        </button>
      </div>
      <DraftTeachingMoment moment={moment} />
    </div>
  );
}
