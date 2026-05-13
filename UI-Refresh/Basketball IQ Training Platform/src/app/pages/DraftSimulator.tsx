import { useState } from 'react';
import { Card, ProspectCard } from '../components/Cards';
import { Button } from '../components/Buttons';
import { Clock, Users, TrendingUp, Trophy } from 'lucide-react';
import { Link } from 'react-router';

export function DraftSimulator() {
  const [phase, setPhase] = useState<'entry' | 'draft' | 'recap'>('entry');

  if (phase === 'entry') {
    return <DraftEntry onStart={() => setPhase('draft')} />;
  }

  if (phase === 'draft') {
    return <DraftBoard onComplete={() => setPhase('recap')} />;
  }

  return <DraftRecap />;
}

function DraftEntry({ onStart }: { onStart: () => void }) {
  const savedRuns = [
    { team: 'Lakers', pick: 8, date: 'April 28, 2026', grade: 'A-' },
    { team: 'Celtics', pick: 15, date: 'April 25, 2026', grade: 'B+' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--gm-green)]/20 to-[var(--gm-green)]/10 flex items-center justify-center">
          <Trophy className="w-10 h-10 text-[var(--gm-green)]" />
        </div>
        <h1 className="mb-2">Draft Simulator</h1>
        <p className="text-muted-foreground">
          Test your GM IQ by building through the draft
        </p>
      </div>

      <Card>
        <h2 className="mb-4">Start New Draft</h2>
        <div className="space-y-3 mb-6">
          <div className="p-4 bg-muted/50 rounded-lg">
            <label className="block text-sm mb-2">Select Your Team</label>
            <select className="w-full px-4 py-2 bg-card border border-border rounded-lg">
              <option>Random Team</option>
              <option>Lakers (Pick #8)</option>
              <option>Celtics (Pick #15)</option>
              <option>Knicks (Pick #12)</option>
              <option>Warriors (Pick #22)</option>
            </select>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <label className="block text-sm mb-2">Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              <button className="px-4 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg">
                Easy
              </button>
              <button className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent">
                Medium
              </button>
              <button className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent">
                Hard
              </button>
            </div>
          </div>
        </div>

        <Button onClick={onStart} className="w-full" size="lg">
          Start Draft Simulation
        </Button>
      </Card>

      {savedRuns.length > 0 && (
        <Card>
          <h3 className="mb-4">Your Previous Drafts</h3>
          <div className="space-y-3">
            {savedRuns.map((run, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-medium mb-1">{run.team} - Pick #{run.pick}</div>
                  <div className="text-sm text-muted-foreground">{run.date}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-[var(--gm-green)]/10 text-[var(--gm-green)] rounded">
                    Grade: {run.grade}
                  </div>
                  <Button variant="outline" size="sm">Resume</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function DraftBoard({ onComplete }: { onComplete: () => void }) {
  const [currentPick, setCurrentPick] = useState(8);
  const [timeRemaining, setTimeRemaining] = useState(120);

  const prospects = [
    {
      name: 'Marcus Johnson',
      position: 'SG',
      college: 'Duke',
      attributes: { overall: 85, offense: 88, defense: 82, potential: 90 },
      uncertainty: false
    },
    {
      name: 'Alex Rivera',
      position: 'PF',
      college: 'UCLA',
      attributes: { overall: 83, offense: 80, defense: 86, potential: 85 },
      uncertainty: true
    },
    {
      name: 'Jordan Chen',
      position: 'PG',
      college: 'Kentucky',
      attributes: { overall: 84, offense: 87, defense: 79, potential: 88 },
      uncertainty: false
    },
  ];

  return (
    <div className="max-w-screen-xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Lakers on the Clock</h1>
          <p className="text-muted-foreground">Pick #{currentPick} - 1st Round</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--basketball-orange)]" />
            <span className="text-2xl">{timeRemaining}s</span>
          </div>
          <Button variant="outline" size="sm">Skip Pick</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2>Available Prospects</h2>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-[var(--basketball-orange)]/10 text-[var(--basketball-orange)] rounded text-sm">
                  By Rank
                </button>
                <button className="px-3 py-1 bg-muted text-muted-foreground rounded text-sm hover:bg-muted/70">
                  By Position
                </button>
                <button className="px-3 py-1 bg-muted text-muted-foreground rounded text-sm hover:bg-muted/70">
                  By Fit
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {prospects.map((prospect, i) => (
                <ProspectCard key={i} {...prospect} />
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-[var(--player-blue)]" />
              <h3>Team Needs</h3>
            </div>
            <div className="space-y-2">
              {[
                { position: 'Shooting Guard', priority: 'High', color: 'red' },
                { position: 'Power Forward', priority: 'Medium', color: 'yellow' },
                { position: 'Point Guard', priority: 'Low', color: 'green' },
              ].map((need, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm">{need.position}</span>
                  <span className={`px-2 py-0.5 ${
                    need.color === 'red' ? 'bg-red-500/10 text-red-500' :
                    need.color === 'yellow' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-green-500/10 text-green-500'
                  } text-xs rounded`}>
                    {need.priority}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-yellow-500/5 border-yellow-500/20">
            <TrendingUp className="w-5 h-5 text-yellow-500 mb-2" />
            <h4 className="text-sm mb-2">Insight</h4>
            <p className="text-sm text-muted-foreground">
              Marcus Johnson fills your biggest need (SG) and has the highest ceiling. Strong pick-and-roll chemistry with your current PG.
            </p>
          </Card>

          <div className="space-y-2">
            <Button className="w-full">Make Selection</Button>
            <Button variant="outline" className="w-full">Explore Trade</Button>
            <Button variant="ghost" className="w-full" onClick={onComplete}>
              Auto-Draft Remaining
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DraftRecap() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center">
          <Trophy className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="mb-2">Draft Complete!</h1>
        <p className="text-muted-foreground">Lakers 2026 Draft Class</p>
      </div>

      <Card className="bg-gradient-to-r from-green-500/10 to-transparent border-green-500/30">
        <div className="text-center">
          <div className="text-6xl text-green-500 mb-2">A-</div>
          <h2 className="mb-1">Overall Draft Grade</h2>
          <p className="text-sm text-muted-foreground">
            Excellent draft! You addressed key needs and maximized value.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <div className="text-2xl text-[var(--player-blue)] mb-1">92</div>
          <div className="text-sm text-muted-foreground">Player IQ</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl text-[var(--coach-purple)] mb-1">88</div>
          <div className="text-sm text-muted-foreground">Coach IQ</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl text-[var(--gm-green)] mb-1">95</div>
          <div className="text-sm text-muted-foreground">GM IQ</div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4">What Went Right</h2>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
            <p className="text-sm">Selected Marcus Johnson at #8 - fills SG need with high upside</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
            <p className="text-sm">Strong pick-and-roll fit with existing roster</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
            <p className="text-sm">Maximized value - Johnson projected higher than draft position</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4">Recommended Follow-up Lessons</h3>
        <div className="space-y-2">
          <Link to="/learning/gm/lesson/player-development">
            <div className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <h4 className="text-sm mb-1">Player Development Strategies</h4>
              <p className="text-xs text-muted-foreground">Maximize your draft picks' potential</p>
            </div>
          </Link>
        </div>
      </Card>

      <div className="flex gap-3">
        <Link to="/draft-sim" className="flex-1">
          <Button variant="outline" className="w-full">New Draft</Button>
        </Link>
        <Link to="/learning/gm" className="flex-1">
          <Button className="w-full">Continue Learning</Button>
        </Link>
      </div>
    </div>
  );
}
