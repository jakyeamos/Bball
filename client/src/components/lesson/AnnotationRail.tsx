import React from 'react';
import { TimestampAnnotation } from '@nba-draft-sim/shared';

interface AnnotationRailProps {
  annotations?: TimestampAnnotation[];
  currentTime: number;
  onSeek: (timestamp: number) => void;
}

export function AnnotationRail({ annotations, currentTime, onSeek }: AnnotationRailProps) {
  if (!annotations || annotations.length === 0) {
    return (
      <div className="bg-cv-steel border border-cv-court/20 rounded-cv p-6 flex items-center justify-center h-full">
         <p className="text-cv-chalk/40 text-sm">No annotations available.</p>
      </div>
    );
  }

  // Find active annotation based on currentTime. It's the one with the largest timestamp <= currentTime.
  const sorted = [...annotations].sort((a, b) => a.timestamp - b.timestamp);
  let activeIndex = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (currentTime >= sorted[i].timestamp) {
      activeIndex = i;
    }
  }

  return (
    <div className="bg-cv-steel border border-cv-court/30 rounded-cv overflow-hidden flex flex-col h-full max-h-[600px]">
      <div className="p-4 border-b border-cv-court/20 bg-cv-navy/30">
        <h3 className="text-cv-chalk font-semibold text-sm uppercase tracking-widest text-cv-accent">Play Breakdown</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sorted.map((ann, index) => {
          const isActive = index === activeIndex;
          
          return (
            <button
              key={index}
              onClick={() => onSeek(ann.timestamp)}
              className={`w-full text-left p-4 rounded-cv transition-colors flex gap-4 items-start ${
                isActive 
                  ? 'bg-cv-navy border border-cv-accent/50 shadow-[0_0_10px_rgba(255,102,0,0.1)]' 
                  : 'bg-transparent border border-cv-court/10 hover:border-cv-court/40'
              }`}
            >
               <span className={`font-mono text-sm px-2 py-1 rounded bg-cv-steel ${isActive ? 'text-cv-accent font-bold' : 'text-cv-chalk/60'}`}>
                 {formatTime(ann.timestamp)}
               </span>
               <p className={`text-sm leading-relaxed ${isActive ? 'text-cv-chalk font-medium' : 'text-cv-chalk/70'}`}>
                 {ann.note}
               </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
