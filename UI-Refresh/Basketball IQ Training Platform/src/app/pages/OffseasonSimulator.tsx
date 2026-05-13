import { useState } from 'react';
import { Card } from '../components/Cards';
import { Button } from '../components/Buttons';
import { Users, TrendingUp, DollarSign, Target } from 'lucide-react';
import { Link } from 'react-router';

export function OffseasonSimulator() {
  const [phase, setPhase] = useState<'entry' | 'coaching' | 'scouting' | 'draft' | 'free-agency' | 'recap'>('entry');

  if (phase === 'entry') {
    return <OffseasonEntry onStart={() => setPhase('coaching')} />;
  }

  if (phase === 'coaching') {
    return <CoachingMarket onNext={() => setPhase('scouting')} />;
  }

  if (phase === 'scouting') {
    return <ScoutingPhase onNext={() => setPhase('draft')} />;
  }

  if (phase === 'draft') {
    return <DraftNight onNext={() => setPhase('free-agency')} />;
  }

  if (phase === 'free-agency') {
    return <FreeAgency onComplete={() => setPhase('recap')} />;
  }

  return <OffseasonRecap />;
}

function OffseasonEntry({ onStart }: { onStart: () => void }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--coach-purple)]/20 to-[var(--gm-green)]/20 flex items-center justify-center">
          <Users className="w-10 h-10 text-[var(--gm-green)]" />
        </div>
        <h1 className="mb-2">Offseason Simulator</h1>
        <p className="text-muted-foreground">
          Build your championship roster through coaching, draft, and free agency
        </p>
      </div>

      <Card>
        <h2 className="mb-4">Select Your Team</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {[
            { team: 'Rebuilding Team', cap: '$45M', picks: '3 picks', difficulty: 'Medium' },
            { team: 'Contending Team', cap: '$12M', picks: '1 pick', difficulty: 'Hard' },
            { team: 'Mid-tier Team', cap: '$28M', picks: '2 picks', difficulty: 'Easy' },
          ].map((option, i) => (
            <div
              key={i}
              className="p-4 border-2 border-border rounded-lg hover:border-[var(--basketball-orange)] transition-colors cursor-pointer"
            >
              <h3 className="mb-2">{option.team}</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Cap Space: {option.cap}</p>
                <p>Draft Capital: {option.picks}</p>
                <p className="text-[var(--basketball-orange)]">Difficulty: {option.difficulty}</p>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={onStart} className="w-full" size="lg">
          Begin Offseason
        </Button>
      </Card>
    </div>
  );
}

function CoachingMarket({ onNext }: { onNext: () => void }) {
  const coaches = [
    {
      name: 'Mike Stevens',
      experience: '15 years',
      style: 'Defensive minded',
      record: '520-380',
      tendencies: ['Zone heavy', 'Player development']
    },
    {
      name: 'Sarah Johnson',
      experience: '8 years',
      style: 'Offensive innovator',
      record: '310-250',
      tendencies: ['Pace & space', 'Analytics driven']
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="mb-1">Coaching Market</h1>
        <p className="text-muted-foreground">
          Phase 1 of 5: Select your head coach
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {coaches.map((coach, i) => (
          <Card key={i} className="cursor-pointer hover:scale-[1.01]">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="mb-1">{coach.name}</h3>
                <p className="text-sm text-muted-foreground">{coach.experience} • {coach.style}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Career Record</div>
                <div>{coach.record}</div>
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              {coach.tendencies.map((tendency, j) => (
                <span key={j} className="px-2 py-1 bg-muted text-xs rounded">
                  {tendency}
                </span>
              ))}
            </div>
            <Button variant="outline" className="w-full">Hire Coach</Button>
          </Card>
        ))}
      </div>

      <Button onClick={onNext} className="w-full">
        Continue to Scouting
      </Button>
    </div>
  );
}

function ScoutingPhase({ onNext }: { onNext: () => void }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="mb-1">Scouting & Draft Prep</h1>
        <p className="text-muted-foreground">
          Phase 2 of 5: Build your draft board
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2>Scouting Budget</h2>
          <div className="flex items-center gap-2 text-[var(--basketball-orange)]">
            <DollarSign className="w-5 h-5" />
            <span>$500,000 remaining</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Allocate scouting resources to reduce uncertainty on prospects
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        {[
          { player: 'Marcus Johnson', uncertainty: 'High', cost: '$150K' },
          { player: 'Alex Rivera', uncertainty: 'Medium', cost: '$100K' },
          { player: 'Jordan Chen', uncertainty: 'Low', cost: '$50K' },
        ].map((prospect, i) => (
          <Card key={i}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="mb-1">{prospect.player}</h4>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    prospect.uncertainty === 'High' ? 'bg-red-500/10 text-red-500' :
                    prospect.uncertainty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-green-500/10 text-green-500'
                  }`}>
                    {prospect.uncertainty} Uncertainty
                  </span>
                  <span className="text-sm text-muted-foreground">{prospect.cost} to scout</span>
                </div>
              </div>
              <Button size="sm" variant="outline">Scout</Button>
            </div>
          </Card>
        ))}
      </div>

      <Button onClick={onNext} className="w-full">
        Proceed to Draft
      </Button>
    </div>
  );
}

function DraftNight({ onNext }: { onNext: () => void }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="mb-1">Draft Night</h1>
        <p className="text-muted-foreground">
          Phase 3 of 5: Make your selections
        </p>
      </div>

      <Card className="bg-gradient-to-r from-[var(--gm-green)]/10 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="mb-1">Pick #12 is on the clock</h3>
            <p className="text-sm text-muted-foreground">Make your selection</p>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[var(--basketball-orange)]" />
            <span className="text-2xl">90s</span>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4">Top Available</h3>
        <div className="space-y-2">
          {[
            { name: 'Marcus Johnson', position: 'SG', fit: 'Excellent' },
            { name: 'Alex Rivera', position: 'PF', fit: 'Good' },
            { name: 'Jordan Chen', position: 'PG', fit: 'Fair' },
          ].map((player, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer"
            >
              <div>
                <h4 className="mb-1">{player.name}</h4>
                <p className="text-sm text-muted-foreground">{player.position}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs rounded ${
                  player.fit === 'Excellent' ? 'bg-green-500/10 text-green-500' :
                  player.fit === 'Good' ? 'bg-yellow-500/10 text-yellow-500' :
                  'bg-orange-500/10 text-orange-500'
                }`}>
                  {player.fit} Fit
                </span>
                <Button size="sm">Select</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Button onClick={onNext} className="w-full">
        Continue to Free Agency
      </Button>
    </div>
  );
}

function FreeAgency({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="mb-1">Free Agency</h1>
        <p className="text-muted-foreground">
          Phase 4 of 5: Sign free agents
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2>Cap Space</h2>
          <div className="flex items-center gap-2 text-[var(--gm-green)]">
            <DollarSign className="w-5 h-5" />
            <span>$28M available</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        {[
          { name: 'Veteran Wing', role: 'Role Player', cost: '$8M/yr', fit: 'High' },
          { name: 'Starting PG', role: 'Starter', cost: '$18M/yr', fit: 'Medium' },
          { name: 'Backup Big', role: 'Bench', cost: '$4M/yr', fit: 'High' },
        ].map((player, i) => (
          <Card key={i}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="mb-1">{player.name}</h4>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{player.role}</span>
                  <span>•</span>
                  <span className="text-[var(--basketball-orange)]">{player.cost}</span>
                  <span>•</span>
                  <span className={
                    player.fit === 'High' ? 'text-green-500' : 'text-yellow-500'
                  }>
                    {player.fit} Fit
                  </span>
                </div>
              </div>
              <Button size="sm" variant="outline">Sign</Button>
            </div>
          </Card>
        ))}
      </div>

      <Button onClick={onComplete} className="w-full">
        Complete Offseason
      </Button>
    </div>
  );
}

function OffseasonRecap() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center">
          <TrendingUp className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="mb-2">Offseason Complete!</h1>
        <p className="text-muted-foreground">2026 Offseason Results</p>
      </div>

      <Card className="bg-gradient-to-r from-green-500/10 to-transparent border-green-500/30 text-center">
        <div className="text-6xl text-green-500 mb-2">B+</div>
        <h2 className="mb-1">Overall Grade</h2>
        <p className="text-sm text-muted-foreground">
          Strong offseason with smart moves across all phases
        </p>
      </Card>

      <Card>
        <h2 className="mb-4">Team Outlook</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Projected Wins</span>
            <span className="text-[var(--gm-green)]">48-52</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Playoff Odds</span>
            <span className="text-[var(--player-blue)]">75%</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Development Potential</span>
            <span className="text-[var(--basketball-orange)]">High</span>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Link to="/offseason-sim" className="flex-1">
          <Button variant="outline" className="w-full">New Offseason</Button>
        </Link>
        <Link to="/learning/gm" className="flex-1">
          <Button className="w-full">Continue Learning</Button>
        </Link>
      </div>
    </div>
  );
}
