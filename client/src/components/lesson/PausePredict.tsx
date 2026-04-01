import React, { useRef, useState } from 'react';
import { PausePredictPayload } from '@nba-draft-sim/shared';
import { FilmBreakdown, FilmBreakdownRef } from './FilmBreakdown';
import { PausePredictFallback } from './PausePredictFallback';
import { PausePredictPhase, transitionPausePredictState } from '../../features/lesson/lessonStateMachine';

interface PausePredictProps {
  title: string;
  contentUrl?: string;
  interaction: PausePredictPayload;
  onComplete?: (score: number) => void;
}

export function PausePredict({
  title,
  contentUrl,
  interaction,
  onComplete,
}: PausePredictProps) {
  const playerRef = useRef<FilmBreakdownRef>(null);
  const [phase, setPhase] = useState<PausePredictPhase>('idle');
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  if (!contentUrl) {
    return (
      <PausePredictFallback
        title={title}
        summary="This lesson can still be completed in text mode. Review the prompt, choose the best process answer, and use the explanation to compare your reasoning."
      />
    );
  }

  return (
    <div className="space-y-4">
      <FilmBreakdown
        ref={playerRef}
        contentUrl={contentUrl}
        onReady={() => setPhase((current) => transitionPausePredictState(current, 'start'))}
        onTimeUpdate={(time) => {
          if (phase === 'playing' && time >= interaction.pause_at) {
            playerRef.current?.pause();
            setPhase((current) => transitionPausePredictState(current, 'autoPause'));
          }
        }}
        onError={() => setPhase('fallback')}
      />

      {phase === 'fallback' ? (
        <PausePredictFallback
          title={title}
          summary={interaction.explanation}
          onRetry={() => window.location.reload()}
        />
      ) : null}

      {phase === 'pausedForQuestion' || phase === 'answering' || phase === 'reveal' ? (
        <div className="rounded-cv border border-cv-court/30 bg-cv-steel p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-3">
            Pause And Predict
          </p>
          <h3 className="text-xl font-semibold text-cv-chalk mb-4">{interaction.prompt}</h3>
          <div className="space-y-3">
            {interaction.choices.map((choice) => {
              const active = selectedChoice === choice.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  disabled={phase === 'reveal'}
                  onClick={() => setSelectedChoice(choice.id)}
                  className={`w-full rounded-cv border px-4 py-3 text-left transition-colors ${
                    active
                      ? 'border-cv-accent bg-cv-navy text-cv-chalk'
                      : 'border-cv-court/20 bg-cv-navy/30 text-cv-chalk/80 hover:border-cv-court/50'
                  }`}
                >
                  {choice.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              disabled={!selectedChoice || phase === 'reveal'}
              onClick={() => {
                setPhase((current) => transitionPausePredictState(current, 'submit'));
                setPhase((current) => transitionPausePredictState(current, 'reveal'));
                onComplete?.(selectedChoice === interaction.correct_choice_id ? 100 : 50);
              }}
              className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Reveal Explanation
            </button>
            {phase === 'reveal' ? (
              <button
                type="button"
                onClick={() => {
                  playerRef.current?.play();
                  setPhase((current) => transitionPausePredictState(current, 'resume'));
                }}
                className="rounded-cv border border-cv-accent/40 px-4 py-2 text-sm font-semibold text-cv-chalk"
              >
                Resume Video
              </button>
            ) : null}
          </div>
          {phase === 'reveal' ? (
            <div className="mt-4 rounded-cv border border-cv-court/20 bg-cv-navy/30 p-4">
              <p className="font-semibold text-cv-chalk mb-2">
                {selectedChoice === interaction.correct_choice_id ? 'Strong read' : 'Better process available'}
              </p>
              <p className="text-sm leading-6 text-cv-chalk/75">{interaction.explanation}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
