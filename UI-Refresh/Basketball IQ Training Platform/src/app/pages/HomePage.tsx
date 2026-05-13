import { IQCard, ChallengeCard, Card } from '../components/Cards';
import { Button } from '../components/Buttons';
import { ArrowRight, Play, BookOpen, Target, Users } from 'lucide-react';
import { Link } from 'react-router';

export function HomePage() {
  return (
    <div className="max-w-screen-xl mx-auto p-6 space-y-8">
      <section className="bg-gradient-to-r from-[var(--basketball-orange)]/20 to-transparent border border-border rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-3xl mb-2">Welcome back to Court Vision</h1>
            <p className="text-muted-foreground mb-6">
              Continue your journey to thinking like a Player, Coach, and GM
            </p>
            <Link to="/learning/player/lesson/pick-and-roll-reads">
              <Button size="lg">
                <Play className="w-5 h-5" />
                Resume Learning: Pick & Roll Reads
              </Button>
            </Link>
          </div>
          <div className="hidden lg:block">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[var(--basketball-orange)] to-[var(--basketball-orange)]/50 flex items-center justify-center">
              <Target className="w-16 h-16 text-white" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4">Your IQ Development</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <IQCard
            type="player"
            progress={45}
            nextLesson="Pick & Roll Reads"
            link="/learning/player"
          />
          <IQCard
            type="coach"
            progress={28}
            nextLesson="Defensive Schemes"
            link="/learning/coach"
          />
          <IQCard
            type="gm"
            progress={15}
            nextLesson="Draft Strategy 101"
            link="/learning/gm"
          />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2>Daily Challenge</h2>
          <Link to="/daily-challenge" className="text-sm text-[var(--basketball-orange)] hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <ChallengeCard
          title="3rd Quarter Adjustments"
          description="Your team is down 12 at halftime. What adjustments do you make?"
          status="available"
          streak={5}
        />
      </section>

      <section>
        <h2 className="mb-4">Quick Navigation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/learning">
            <Card className="cursor-pointer hover:scale-[1.02] text-center">
              <BookOpen className="w-8 h-8 mx-auto mb-3 text-[var(--basketball-orange)]" />
              <h3 className="text-lg mb-1">Learning Library</h3>
              <p className="text-sm text-muted-foreground">Browse all lessons</p>
            </Card>
          </Link>

          <Link to="/draft-sim">
            <Card className="cursor-pointer hover:scale-[1.02] text-center">
              <Target className="w-8 h-8 mx-auto mb-3 text-[var(--gm-green)]" />
              <h3 className="text-lg mb-1">Draft Simulator</h3>
              <p className="text-sm text-muted-foreground">Test your GM IQ</p>
            </Card>
          </Link>

          <Link to="/offseason-sim">
            <Card className="cursor-pointer hover:scale-[1.02] text-center">
              <Users className="w-8 h-8 mx-auto mb-3 text-[var(--coach-purple)]" />
              <h3 className="text-lg mb-1">Offseason Sim</h3>
              <p className="text-sm text-muted-foreground">Build your roster</p>
            </Card>
          </Link>

          <Link to="/leaderboard">
            <Card className="cursor-pointer hover:scale-[1.02] text-center">
              <Target className="w-8 h-8 mx-auto mb-3 text-[var(--player-blue)]" />
              <h3 className="text-lg mb-1">Leaderboard</h3>
              <p className="text-sm text-muted-foreground">See rankings</p>
            </Card>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4">Recommended for You</h2>
        <div className="space-y-3">
          {[
            { title: 'Understanding Zone Defense Weaknesses', reason: 'Based on your Coach IQ progress', lane: 'coach' },
            { title: 'Reading Help Defense Rotations', reason: 'Complete this to unlock advanced reads', lane: 'player' },
            { title: 'Evaluating Wing Prospects', reason: 'High impact for your draft sim performance', lane: 'gm' }
          ].map((rec, i) => (
            <Card key={i} className="cursor-pointer hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="mb-1">{rec.title}</h4>
                  <p className="text-sm text-muted-foreground">{rec.reason}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    rec.lane === 'player' ? 'bg-[var(--player-blue)]/10 text-[var(--player-blue)]' :
                    rec.lane === 'coach' ? 'bg-[var(--coach-purple)]/10 text-[var(--coach-purple)]' :
                    'bg-[var(--gm-green)]/10 text-[var(--gm-green)]'
                  }`}>
                    {rec.lane.toUpperCase()} IQ
                  </span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
