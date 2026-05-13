import React, { useState } from 'react';
import { DailyChallengeRecord, DailyChallengeResult } from '@nba-draft-sim/shared';
import { shareResultCard } from './shareCard';

interface DailyChallengeCardProps {
  challenge: DailyChallengeRecord;
  result?: DailyChallengeResult;
  isSubmitting?: boolean;
  onSubmit: (payload: { challenge_id: string; selected_choice_id: string }) => void;
}

export function DailyChallengeCard({
  challenge,
  result,
  isSubmitting,
  onSubmit,
}: DailyChallengeCardProps) {
  const [selectedChoiceId, setSelectedChoiceId] = useState<string>('');
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');

  return (
    <div className="cv-surface rounded-cv p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cv-accent">Daily Challenge</p>
          <h3 className="text-2xl font-semibold text-cv-chalk">{challenge.title}</h3>
        </div>
        <span className="text-xs text-cv-chalk/45">{challenge.challenge_date}</span>
      </div>
      <p className="mb-4 text-sm leading-6 text-cv-chalk/75">{challenge.prompt}</p>
      <div className="space-y-3">
        {challenge.choices.map((choice) => {
          const active = selectedChoiceId === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              disabled={Boolean(result)}
              onClick={() => setSelectedChoiceId(choice.id)}
              className={`w-full rounded-cv border px-4 py-3 text-left transition-colors ${
                active
                  ? 'border-cv-accent bg-cv-navy text-cv-chalk'
                  : 'border-cv-court/40 bg-white text-cv-chalk/80 hover:border-cv-court'
              }`}
            >
              {choice.label}
            </button>
          );
        })}
      </div>
      {!result ? (
        <button
          type="button"
          disabled={!selectedChoiceId || isSubmitting}
          onClick={() =>
            onSubmit({
              challenge_id: challenge.id,
              selected_choice_id: selectedChoiceId,
            })
          }
          className="mt-4 rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(249,115,22,0.2)] disabled:opacity-50"
        >
          {isSubmitting ? 'Checking...' : 'Submit Daily Answer'}
        </button>
      ) : (
        <div className="mt-4 rounded-cv border border-cv-court/60 bg-cv-navy/60 p-4">
          <p className="font-semibold text-cv-chalk mb-2">
            {result.correct ? 'Correct' : 'Keep the explanation and try again tomorrow'}
          </p>
          <p className="text-sm leading-6 text-cv-chalk/75 mb-3">{result.explanation}</p>
          <div className="flex flex-wrap gap-3 text-sm text-cv-chalk/70">
            <span>Track: {challenge.role_lens.toUpperCase()}</span>
            <span>Streak: {result.streak.current_streak}</span>
            <span>Badges: {result.badges.length}</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              await shareResultCard(challenge, result);
              setShareState('copied');
            }}
            className="mt-4 rounded-cv border border-cv-accent/40 bg-white px-4 py-2 text-sm font-semibold text-cv-chalk"
          >
            {shareState === 'copied' ? 'Shared / Copied' : 'Share Result'}
          </button>
        </div>
      )}
    </div>
  );
}
