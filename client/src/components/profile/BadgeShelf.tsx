import React from 'react';
import { BadgeRecord } from '@nba-draft-sim/shared';

interface BadgeShelfProps {
  badges: BadgeRecord[];
}

export function BadgeShelf({ badges }: BadgeShelfProps) {
  if (badges.length === 0) {
    return (
      <div className="rounded-cv border border-dashed border-cv-court/30 bg-cv-steel p-5 text-sm text-cv-chalk/60">
        No badges yet. Daily challenges and track completions will start filling this shelf.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {badges.map((badge) => (
        <div key={badge.id} className="rounded-cv border border-cv-court/20 bg-cv-steel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">{badge.category}</p>
          <h3 className="font-semibold text-cv-chalk mb-2">{badge.label}</h3>
          <p className="text-sm leading-6 text-cv-chalk/70">{badge.description}</p>
        </div>
      ))}
    </div>
  );
}
