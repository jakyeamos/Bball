import React from 'react';
import { DraftTeachingMoment as DraftTeachingMomentType } from '@nba-draft-sim/shared';
import { Link } from 'react-router-dom';

interface DraftTeachingMomentProps {
  moment: DraftTeachingMomentType;
}

export function DraftTeachingMoment({ moment }: DraftTeachingMomentProps) {
  const colorClass =
    moment.severity === 'warning'
      ? 'border-amber-500/30 bg-amber-500/10'
      : moment.severity === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10'
      : 'border-cv-court/20 bg-cv-navy/40';

  return (
    <div className={`rounded-cv border p-4 ${colorClass}`}>
      <div className="flex items-center justify-between gap-4 mb-2">
        <h3 className="font-semibold text-cv-chalk">{moment.title}</h3>
        <span className="text-[10px] uppercase tracking-[0.2em] text-cv-chalk/50">
          {moment.trigger.replace('_', ' ')}
        </span>
      </div>
      <p className="text-sm leading-6 text-cv-chalk/75 mb-3">{moment.prompt}</p>
      {moment.lesson_id ? (
        <Link to={`/lessons/${moment.lesson_id}`} className="text-sm font-semibold text-cv-accent hover:underline">
          Study follow-up: {moment.lesson_title ?? 'Related lesson'}
        </Link>
      ) : null}
    </div>
  );
}
