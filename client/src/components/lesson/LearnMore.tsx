import React, { useState } from 'react';
import { LearnMoreSection } from '@nba-draft-sim/shared';

interface LearnMoreProps {
  sections: LearnMoreSection[];
}

export function LearnMore({ sections }: LearnMoreProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (sections.length === 0) return null;

  return (
    <div className="rounded-cv border border-cv-court/30 bg-cv-steel p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-4">
        Learn More
      </p>
      <div className="space-y-3">
        {sections.map((section, index) => {
          const open = openIndex === index;
          return (
            <div key={`${section.title}-${index}`} className="rounded-cv border border-cv-court/20 bg-cv-navy/30">
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="font-semibold text-cv-chalk">{section.title}</span>
                <span className="text-cv-chalk/60">{open ? '−' : '+'}</span>
              </button>
              {open ? (
                <div className="border-t border-cv-court/20 px-4 py-4 text-sm leading-6 text-cv-chalk/75">
                  {section.body}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
