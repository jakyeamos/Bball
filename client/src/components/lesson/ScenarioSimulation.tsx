import React, { useMemo, useState } from 'react';
import { ScenarioSimulationPayload } from '@nba-draft-sim/shared';

interface ScenarioSimulationProps {
  scenario: ScenarioSimulationPayload;
  onComplete?: (score: number) => void;
}

export function ScenarioSimulation({ scenario, onComplete }: ScenarioSimulationProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = useMemo(
    () => submitted && selectedId === scenario.correct_option_id,
    [scenario.correct_option_id, selectedId, submitted]
  );

  const selectedOption = scenario.options.find((option) => option.id === selectedId);

  return (
    <div className="rounded-cv border border-cv-court/30 bg-cv-steel p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-3">
        Scenario Simulation
      </p>
      <h3 className="text-xl font-semibold text-cv-chalk mb-3">{scenario.prompt}</h3>
      <div className="space-y-3">
        {scenario.options.map((option) => {
          const active = selectedId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedId(option.id)}
              className={`w-full rounded-cv border p-4 text-left transition-colors ${
                active
                  ? 'border-cv-accent bg-cv-navy text-cv-chalk'
                  : 'border-cv-court/20 bg-cv-navy/30 text-cv-chalk/80 hover:border-cv-court/50'
              }`}
            >
              <div className="font-semibold mb-1">{option.title}</div>
              <div className="text-sm leading-6 text-inherit/80">{option.description}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-4">
        <button
          type="button"
          disabled={!selectedId || submitted}
          onClick={() => {
            setSubmitted(true);
            onComplete?.(selectedId === scenario.correct_option_id ? 100 : 40);
          }}
          className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitted ? 'Submitted' : 'Submit Answer'}
        </button>
        {selectedOption ? (
          <span className="text-sm text-cv-chalk/60">Selected: {selectedOption.title}</span>
        ) : null}
      </div>
      {submitted ? (
        <div
          className={`mt-4 rounded-cv border p-4 ${
            isCorrect
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-amber-500/30 bg-amber-500/10'
          }`}
        >
          <p className="font-semibold text-cv-chalk mb-2">
            {isCorrect ? 'Correct process' : 'Try the higher-value process'}
          </p>
          <p className="text-sm leading-6 text-cv-chalk/80">{scenario.explanation}</p>
        </div>
      ) : null}
    </div>
  );
}
