import { Card } from '../components/Cards';
import { StatsDisplay, ProgressBar } from '../components/Progress';
import { Tag } from '../components/Tags';
import { Trophy, Target, Zap, Calendar } from 'lucide-react';

export function Profile() {
  const badges = [
    { name: '7-Day Streak', icon: '🔥', earned: true },
    { name: 'First Draft', icon: '🎯', earned: true },
    { name: 'Coach Master', icon: '📋', earned: false },
    { name: 'GM Legend', icon: '👔', earned: false },
  ];

  const weakAreas = [
    { concept: 'Zone Defense Principles', lane: 'coach' },
    { concept: 'Cap Space Management', lane: 'gm' },
    { concept: 'Off-ball Movement', lane: 'player' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="bg-gradient-to-r from-[var(--basketball-orange)]/20 to-transparent">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--player-blue)] to-[var(--coach-purple)] flex items-center justify-center text-white text-3xl">
            ME
          </div>
          <div className="flex-1">
            <h1 className="mb-1">Your Profile</h1>
            <p className="text-muted-foreground mb-4">Basketball IQ Enthusiast since March 2026</p>
            <div className="flex gap-2">
              <Tag variant="player">Player IQ: 45%</Tag>
              <Tag variant="coach">Coach IQ: 28%</Tag>
              <Tag variant="gm">GM IQ: 15%</Tag>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 className="mb-4">Overall Stats</h2>
          <StatsDisplay
            stats={[
              { label: 'Total XP', value: '3,100', color: 'var(--basketball-orange)' },
              { label: 'Lessons Completed', value: 18, color: 'var(--player-blue)' },
              { label: 'Current Streak', value: '5 days', color: 'var(--gm-green)' },
              { label: 'Challenges Won', value: 12, color: 'var(--coach-purple)' },
            ]}
          />
        </Card>

        <Card>
          <h2 className="mb-4">IQ Progress</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Player IQ</span>
                <span className="text-sm text-[var(--player-blue)]">45%</span>
              </div>
              <ProgressBar progress={45} color="var(--player-blue)" showLabel={false} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Coach IQ</span>
                <span className="text-sm text-[var(--coach-purple)]">28%</span>
              </div>
              <ProgressBar progress={28} color="var(--coach-purple)" showLabel={false} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">GM IQ</span>
                <span className="text-sm text-[var(--gm-green)]">15%</span>
              </div>
              <ProgressBar progress={15} color="var(--gm-green)" showLabel={false} />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-[var(--basketball-orange)]" />
          <h2>Achievements & Badges</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.name}
              className={`p-4 rounded-lg text-center ${
                badge.earned
                  ? 'bg-gradient-to-br from-[var(--basketball-orange)]/10 to-transparent border-2 border-[var(--basketball-orange)]/30'
                  : 'bg-muted/30 opacity-50'
              }`}
            >
              <div className="text-4xl mb-2">{badge.icon}</div>
              <div className="text-sm">{badge.name}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h2>Activity Streak</h2>
          </div>
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🔥</div>
            <div className="text-3xl mb-1">5 Days</div>
            <div className="text-sm text-muted-foreground">Keep it going!</div>
          </div>
          <div className="flex gap-1">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-8 rounded ${
                  i < 5 ? 'bg-[var(--basketball-orange)]' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-red-500" />
            <h2>Focus Areas</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Concepts you've struggled with - recommended for review
          </p>
          <div className="space-y-2">
            {weakAreas.map((area, i) => (
              <div
                key={i}
                className="p-3 bg-muted/50 rounded-lg flex items-center justify-between hover:bg-muted transition-colors cursor-pointer"
              >
                <span className="text-sm">{area.concept}</span>
                <Tag variant={area.lane as 'player' | 'coach' | 'gm'}>
                  {area.lane.toUpperCase()} IQ
                </Tag>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-[var(--player-blue)]" />
          <h2>Recent Activity</h2>
        </div>
        <div className="space-y-3">
          {[
            { date: 'Today', activity: 'Completed Daily Challenge: 3rd Quarter Adjustments', xp: 50 },
            { date: 'Yesterday', activity: 'Finished Lesson: Pick and Roll Reads', xp: 150 },
            { date: '2 days ago', activity: 'Completed Daily Challenge: Draft Trade Decision', xp: 50 },
            { date: '3 days ago', activity: 'Finished Lesson: Zone Defense Principles', xp: 120 },
          ].map((item, i) => (
            <div key={i} className="flex items-start justify-between pb-3 border-b border-border last:border-0">
              <div className="flex-1">
                <div className="text-sm text-muted-foreground mb-1">{item.date}</div>
                <div>{item.activity}</div>
              </div>
              <div className="text-[var(--basketball-orange)]">+{item.xp} XP</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
