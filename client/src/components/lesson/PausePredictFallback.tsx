import React from 'react';

interface PausePredictFallbackProps {
  title: string;
  summary: string;
  onRetry?: () => void;
}

export function PausePredictFallback({
  title,
  summary,
  onRetry,
}: PausePredictFallbackProps) {
  return (
    <div className="rounded-cv border border-cv-court/30 bg-cv-steel p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-3">
        Fallback Lesson Mode
      </p>
      <h3 className="text-xl font-semibold text-cv-chalk mb-3">{title}</h3>
      <p className="text-sm leading-6 text-cv-chalk/70 mb-4">{summary}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-cv border border-cv-accent/40 px-4 py-2 text-sm font-medium text-cv-chalk hover:border-cv-accent hover:text-white"
        >
          Retry video
        </button>
      ) : null}
    </div>
  );
}
