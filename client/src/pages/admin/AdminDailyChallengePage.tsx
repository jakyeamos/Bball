import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { featureFlags } from '@nba-draft-sim/shared';
import { apiService } from '../../services/api';

export function AdminDailyChallengePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data } = useQuery({
    queryKey: ['admin-lessons'],
    queryFn: apiService.getAdminLessons,
    enabled: featureFlags.cmsDailySchedulingEnabled,
  });

  if (!featureFlags.cmsDailySchedulingEnabled) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-cv-chalk/70">Daily scheduling is disabled.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-4xl font-semibold text-cv-chalk mb-6">Admin Daily Challenge</h1>
      <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
        <p className="text-sm text-cv-chalk/70 mb-4">
          Local-first scheduling is backed by the server store. Pick a lesson and date, then save the challenge through the admin API if you want a different calendar sequence.
        </p>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="rounded-cv border border-cv-court/20 bg-cv-navy/40 px-4 py-3 text-cv-chalk"
        />
        <div className="mt-6 space-y-3">
          {data?.lessons.slice(0, 5).map((lesson) => (
            <div key={lesson.id} className="rounded-cv border border-cv-court/20 bg-cv-navy/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-cv-chalk">{lesson.title}</h2>
                  <p className="text-sm text-cv-chalk/60">{date}</p>
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-cv-accent">{lesson.role_lens}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
