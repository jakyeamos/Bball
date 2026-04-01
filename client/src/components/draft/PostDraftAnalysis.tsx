import React from 'react';
import { DraftDecisionInsight } from '@nba-draft-sim/shared';
import { Link } from 'react-router-dom';

interface PostDraftAnalysisProps {
  insights: DraftDecisionInsight[];
}

export function PostDraftAnalysis({ insights }: PostDraftAnalysisProps) {
  if (insights.length === 0) {
    return (
      <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6 text-sm text-cv-chalk/70">
        Complete a draft to unlock teaching analysis for your strongest and weakest decisions.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {insights.map((insight) => (
        <div
          key={insight.id}
          className={`rounded-cv border p-5 ${
            insight.verdict === 'strong'
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-amber-500/30 bg-amber-500/10'
          }`}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">
            {insight.role_lens.toUpperCase()} IQ
          </p>
          <h3 className="text-xl font-semibold text-cv-chalk mb-3">{insight.title}</h3>
          <p className="text-sm leading-6 text-cv-chalk/80 mb-4">{insight.summary}</p>
          {insight.lesson_id ? (
            <Link to={`/lessons/${insight.lesson_id}`} className="text-sm font-semibold text-cv-accent hover:underline">
              Follow-up lesson: {insight.lesson_title ?? 'Related lesson'}
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}
