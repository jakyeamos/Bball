import { Card } from '../components/Cards';
import { Trophy, Medal, TrendingUp } from 'lucide-react';

export function Leaderboard() {
  const friends = [
    { rank: 1, name: 'Jordan Chen', avatar: 'JC', streak: 12, totalXP: 4250, badge: 'gold' },
    { rank: 2, name: 'You', avatar: 'ME', streak: 5, totalXP: 3100, badge: 'silver' },
    { rank: 3, name: 'Taylor Swift', avatar: 'TS', streak: 8, totalXP: 2950, badge: 'bronze' },
    { rank: 4, name: 'Alex Rivera', avatar: 'AR', streak: 3, totalXP: 2700, badge: null },
    { rank: 5, name: 'Sam Park', avatar: 'SP', streak: 15, totalXP: 2650, badge: null },
    { rank: 6, name: 'Morgan Lee', avatar: 'ML', streak: 1, totalXP: 2100, badge: null },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="mb-1">Leaderboard</h1>
        <p className="text-muted-foreground">Compete with friends and track your progress</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center">
          <Trophy className="w-8 h-8 text-[var(--basketball-orange)] mx-auto mb-2" />
          <div className="text-2xl mb-1">2nd</div>
          <div className="text-sm text-muted-foreground">Your Rank</div>
        </Card>

        <Card className="text-center">
          <TrendingUp className="w-8 h-8 text-[var(--gm-green)] mx-auto mb-2" />
          <div className="text-2xl mb-1">5 days</div>
          <div className="text-sm text-muted-foreground">Current Streak</div>
        </Card>

        <Card className="text-center">
          <Medal className="w-8 h-8 text-[var(--player-blue)] mx-auto mb-2" />
          <div className="text-2xl mb-1">3,100</div>
          <div className="text-sm text-muted-foreground">Total XP</div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4">Friends Leaderboard</h2>
        <div className="space-y-3">
          {friends.map((friend) => (
            <div
              key={friend.rank}
              className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                friend.name === 'You'
                  ? 'bg-[var(--basketball-orange)]/10 border-2 border-[var(--basketball-orange)]/30'
                  : 'bg-muted/30 hover:bg-muted/50'
              }`}
            >
              <div className="w-8 text-center font-semibold">
                {friend.rank <= 3 ? (
                  friend.badge === 'gold' ? (
                    <Trophy className="w-6 h-6 text-yellow-500" />
                  ) : friend.badge === 'silver' ? (
                    <Trophy className="w-6 h-6 text-gray-400" />
                  ) : (
                    <Trophy className="w-6 h-6 text-orange-600" />
                  )
                ) : (
                  <span className="text-muted-foreground">{friend.rank}</span>
                )}
              </div>

              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--player-blue)] to-[var(--coach-purple)] flex items-center justify-center text-white">
                {friend.avatar}
              </div>

              <div className="flex-1">
                <div className="font-medium mb-1">{friend.name}</div>
                <div className="text-sm text-muted-foreground">
                  {friend.streak} day streak
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl mb-1">{friend.totalXP.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">XP</div>
              </div>

              {friend.streak >= 10 && (
                <div className="px-2 py-1 bg-[var(--basketball-orange)]/10 text-[var(--basketball-orange)] text-xs rounded">
                  On Fire!
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-gradient-to-r from-[var(--basketball-orange)]/10 to-transparent">
        <h3 className="mb-2">Weekly Challenge</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Complete 7 daily challenges this week to earn a bonus badge
        </p>
        <div className="flex gap-2">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full ${
                i < 5 ? 'bg-[var(--basketball-orange)]' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <div className="mt-2 text-sm text-muted-foreground">5/7 days complete</div>
      </Card>
    </div>
  );
}
