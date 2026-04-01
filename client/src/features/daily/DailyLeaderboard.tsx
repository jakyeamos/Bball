import React from 'react';
import { useDailyLeaderboard } from './useDailyLeaderboard';

export function DailyLeaderboard() {
  const { data, isLoading } = useDailyLeaderboard();

  return (
    <div className="rounded-cv border border-cv-court/30 bg-cv-steel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cv-accent">Friends</p>
          <h3 className="text-lg font-semibold text-cv-chalk">Done / Not Done</h3>
        </div>
        <span className="text-xs text-cv-chalk/50">Status only</span>
      </div>
      {isLoading ? (
        <p className="text-sm text-cv-chalk/60">Loading friend completion status...</p>
      ) : data?.friends.length ? (
        <div className="space-y-3">
          {data.friends.map((friend) => (
            <div
              key={friend.friend_id}
              className="flex items-center justify-between rounded-cv border border-cv-court/20 bg-cv-navy/30 px-4 py-3"
            >
              <span className="text-sm font-medium text-cv-chalk">{friend.display_name}</span>
              <span className={`text-xs font-semibold ${friend.completed ? 'text-emerald-300' : 'text-cv-chalk/50'}`}>
                {friend.completed ? 'Done today' : 'Not done yet'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-cv-chalk/60">
          Add a few friends once you want light accountability. This board does not rank scores.
        </p>
      )}
    </div>
  );
}
