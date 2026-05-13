import React from 'react';
import { useDailyLeaderboard } from './useDailyLeaderboard';

export function DailyLeaderboard() {
  const { data, isLoading } = useDailyLeaderboard();

  return (
    <div className="cv-surface rounded-cv p-5">
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
              className="flex items-center justify-between rounded-cv border border-cv-court/50 bg-cv-navy/60 px-4 py-3"
            >
              <span className="text-sm font-medium text-cv-chalk">{friend.display_name}</span>
              <span className={`text-xs font-semibold ${friend.completed ? 'text-emerald-600' : 'text-cv-chalk/50'}`}>
                {friend.completed ? 'Done today' : 'Not done yet'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-cv border border-dashed border-cv-court/50 bg-cv-navy/55 p-4">
          <p className="text-sm font-semibold text-cv-chalk">No friends connected yet</p>
          <p className="mt-2 text-sm leading-6 text-cv-chalk/60">
            Invite and friend tools are not live yet. When they are, this space will show daily
            completion status only, never a ranked score ladder.
          </p>
        </div>
      )}
    </div>
  );
}
