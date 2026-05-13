import { useParams, Link } from 'react-router';
import { ProgressBar, SkillMap } from '../components/Progress';
import { LessonCard, Card } from '../components/Cards';
import { Button } from '../components/Buttons';
import { Target, Play } from 'lucide-react';

export function LearningTrack() {
  const { lane } = useParams<{ lane: string }>();

  const laneConfig = {
    player: {
      title: 'Player IQ Track',
      subtitle: 'Master on-court reads, decision-making, and execution',
      color: 'var(--player-blue)',
      gradient: 'from-[var(--player-blue)]/20 to-transparent',
      progress: 45
    },
    coach: {
      title: 'Coach IQ Track',
      subtitle: 'Learn schemes, lineup construction, and in-game adjustments',
      color: 'var(--coach-purple)',
      gradient: 'from-[var(--coach-purple)]/20 to-transparent',
      progress: 28
    },
    gm: {
      title: 'GM IQ Track',
      subtitle: 'Master roster building, draft strategy, and team construction',
      color: 'var(--gm-green)',
      gradient: 'from-[var(--gm-green)]/20 to-transparent',
      progress: 15
    }
  };

  const config = laneConfig[lane as keyof typeof laneConfig] || laneConfig.player;

  const skillNodes = lane === 'player' ? [
    { id: '1', title: 'Fundamentals', status: 'completed' as const },
    { id: '2', title: 'Reading Defense', status: 'completed' as const },
    { id: '3', title: 'Pick & Roll', status: 'available' as const },
    { id: '4', title: 'Advanced Reads', status: 'locked' as const },
    { id: '5', title: 'Elite Execution', status: 'locked' as const }
  ] : lane === 'coach' ? [
    { id: '1', title: 'Basic Schemes', status: 'completed' as const },
    { id: '2', title: 'Defensive Sets', status: 'available' as const },
    { id: '3', title: 'Offensive Flow', status: 'locked' as const },
    { id: '4', title: 'Adjustments', status: 'locked' as const },
    { id: '5', title: 'Game Planning', status: 'locked' as const }
  ] : [
    { id: '1', title: 'Draft Basics', status: 'available' as const },
    { id: '2', title: 'Player Eval', status: 'locked' as const },
    { id: '3', title: 'Trade Strategy', status: 'locked' as const },
    { id: '4', title: 'Cap Management', status: 'locked' as const },
    { id: '5', title: 'Team Building', status: 'locked' as const }
  ];

  const lessons = lane === 'player' ? [
    {
      title: 'Pick and Roll Reads - Ball Handler',
      difficulty: 'Intermediate' as const,
      duration: '8 min',
      tags: ['Pick & Roll', 'Decision Making', 'Spacing'],
      completed: false
    },
    {
      title: 'Reading Help Defense Rotations',
      difficulty: 'Intermediate' as const,
      duration: '10 min',
      tags: ['Defense', 'Court Vision', 'Passing'],
      completed: false
    },
    {
      title: 'Corner Pin Reads',
      difficulty: 'Advanced' as const,
      duration: '12 min',
      tags: ['Advanced', 'Reads', 'Counters'],
      completed: false,
      locked: true
    }
  ] : lane === 'coach' ? [
    {
      title: 'Zone Defense Principles',
      difficulty: 'Beginner' as const,
      duration: '7 min',
      tags: ['Defense', 'Schemes', 'Positioning'],
      completed: false
    },
    {
      title: 'Small Ball Lineups',
      difficulty: 'Intermediate' as const,
      duration: '9 min',
      tags: ['Lineups', 'Strategy', 'Spacing'],
      completed: false
    },
    {
      title: 'Late Game Situations',
      difficulty: 'Advanced' as const,
      duration: '11 min',
      tags: ['Clutch', 'Strategy', 'Execution'],
      completed: false,
      locked: true
    }
  ] : [
    {
      title: 'Draft Strategy 101',
      difficulty: 'Beginner' as const,
      duration: '10 min',
      tags: ['Draft', 'Strategy', 'Basics'],
      completed: false
    },
    {
      title: 'Evaluating Wing Prospects',
      difficulty: 'Intermediate' as const,
      duration: '12 min',
      tags: ['Scouting', 'Evaluation', 'Positions'],
      completed: false
    },
    {
      title: 'Building Around a Star',
      difficulty: 'Advanced' as const,
      duration: '15 min',
      tags: ['Roster', 'Construction', 'Strategy'],
      completed: false,
      locked: true
    }
  ];

  return (
    <div className="max-w-screen-xl mx-auto p-6 space-y-8">
      <div className={`bg-gradient-to-r ${config.gradient} border border-border rounded-2xl p-8`}>
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-8 h-8" style={{ color: config.color }} />
          <div>
            <h1>{config.title}</h1>
            <p className="text-muted-foreground">{config.subtitle}</p>
          </div>
        </div>
        <ProgressBar progress={config.progress} color={config.color} />
        <div className="mt-6">
          <Button size="lg">
            <Play className="w-5 h-5" />
            Continue Next Lesson
          </Button>
        </div>
      </div>

      <section>
        <h2 className="mb-4">Your Learning Path</h2>
        <Card>
          <SkillMap nodes={skillNodes} onNodeClick={(id) => console.log('Node clicked:', id)} />
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2>Available Lessons</h2>
          <Link to="/learning/library" className="text-sm text-[var(--basketball-orange)] hover:underline">
            Browse All
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lessons.map((lesson, i) => (
            <LessonCard
              key={i}
              title={lesson.title}
              difficulty={lesson.difficulty}
              duration={lesson.duration}
              tags={lesson.tags}
              completed={lesson.completed}
              locked={lesson.locked}
              onClick={() => !lesson.locked && console.log('Lesson clicked')}
            />
          ))}
        </div>
      </section>

      <section>
        <Card className={`bg-gradient-to-r ${config.gradient}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="mb-2">Ready for the capstone?</h3>
              <p className="text-muted-foreground mb-4">
                Complete this track to unlock the {lane === 'player' ? 'Game Simulator' : lane === 'coach' ? 'Coaching Simulator' : 'Draft Simulator'}
              </p>
            </div>
            <Button variant="outline" disabled>
              Unlock at 100%
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
