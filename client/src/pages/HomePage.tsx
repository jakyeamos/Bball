import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { featureFlags } from '@nba-draft-sim/shared';
import { useLessons } from '../features/learning/queries';
import { useDailyChallenge } from '../features/daily/useDailyChallenge';
import { DailyChallengeCard } from '../features/daily/DailyChallengeCard';
import { DailyLeaderboard } from '../features/daily/DailyLeaderboard';
import { readOnboardingState } from '../features/onboarding/onboardingStorage';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export function HomePage() {
  const { data: lessons } = useLessons();
  const daily = useDailyChallenge();
  const onboardingState = readOnboardingState();
  const [challengeExpanded, setChallengeExpanded] = useState(false);

  const playerLessons = lessons?.filter((lesson) => lesson.role_lens === 'player').slice(0, 3) ?? [];
  const coachLessons = lessons?.filter((lesson) => lesson.role_lens === 'coach').slice(0, 3) ?? [];
  const gmLessons = lessons?.filter((lesson) => lesson.role_lens === 'gm').slice(0, 3) ?? [];

  const nextLessons = useMemo(
    () => ({
      player: playerLessons[0]?.title ?? 'Pick & Roll Reads',
      coach: coachLessons[0]?.title ?? 'Defensive Schemes',
      gm: gmLessons[0]?.title ?? 'Draft Strategy 101',
    }),
    [coachLessons, gmLessons, playerLessons],
  );

  return (
    <div className="mx-auto max-w-screen-xl space-y-8 p-6">
      <section className="rounded-2xl border border-border bg-gradient-to-r from-[rgba(255,107,53,0.2)] to-transparent p-8">
        <div className="flex items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="mb-2 text-3xl font-semibold tracking-tight">Welcome back to Court Vision</h1>
            <p className="mb-6 text-muted-foreground">
              Continue your journey to thinking like a Player, Coach, and GM
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to={playerLessons[0] ? `/lessons/${playerLessons[0].id}` : '/player-iq'}>
                <Button size="lg" variant="secondary" className="bg-primary text-primary-foreground hover:opacity-90">
                  <Icon name="play" className="h-5 w-5" />
                  Resume Learning: {nextLessons.player}
                </Button>
              </Link>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-[var(--basketball-orange)] to-[rgba(255,107,53,0.5)]">
              <Icon name="target" className="h-16 w-16 text-white" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Your IQ Development</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <IQCard
            type="player"
            progress={45}
            nextLesson={nextLessons.player}
            link="/player-iq"
          />
          <IQCard
            type="coach"
            progress={28}
            nextLesson={nextLessons.coach}
            link="/coach-iq"
          />
          <IQCard
            type="gm"
            progress={15}
            nextLesson={nextLessons.gm}
            link="/gm-iq"
          />
        </div>
      </section>

      {featureFlags.dailyChallengeEnabled ? (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Daily Challenge</h2>
            <button
              type="button"
              onClick={() => setChallengeExpanded((expanded) => !expanded)}
              className="flex items-center gap-1 text-sm text-[var(--basketball-orange)] hover:underline"
            >
              {challengeExpanded ? 'Collapse' : 'View All'}
              <Icon name="arrow" className="h-4 w-4" />
            </button>
          </div>
          {challengeExpanded && daily.challenge ? (
            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <DailyChallengeCard
                challenge={daily.challenge}
                result={daily.submitResult}
                isSubmitting={daily.isSubmitting}
                onSubmit={daily.submitAnswer}
              />
              {featureFlags.dailyLeaderboardEnabled ? <DailyLeaderboard /> : null}
            </div>
          ) : (
            <ChallengePreview
              title={daily.challenge?.title ?? '3rd Quarter Adjustments'}
              description={daily.challenge?.prompt ?? 'Your team is down 12 at halftime. What adjustments do you make?'}
              streak={daily.submitResult?.streak.current_streak ?? 5}
              completed={Boolean(daily.submitResult)}
              onStart={() => setChallengeExpanded(true)}
            />
          )}
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Quick Navigation</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <QuickNavCard to="/library" title="Learning Library" description="Browse all lessons" icon="book" accent="var(--basketball-orange)" />
          <QuickNavCard to="/draft-sim" title="Draft Simulator" description="Test your GM IQ" icon="target" accent="var(--gm-green)" />
          <QuickNavCard to="/offseason/team-context" title="Offseason Sim" description="Build your roster" icon="users" accent="var(--coach-purple)" />
          <QuickNavCard to="/profile" title="Profile" description="Track your progress" icon="target" accent="var(--player-blue)" />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">Recommended for You</h2>
        <div className="space-y-3">
          <RecommendationCard
            title={coachLessons[0]?.title ?? 'Understanding Zone Defense Weaknesses'}
            reason="Based on your Coach IQ progress"
            lane="coach"
            to={coachLessons[0] ? `/lessons/${coachLessons[0].id}` : '/coach-iq'}
          />
          <RecommendationCard
            title={playerLessons[1]?.title ?? 'Reading Help Defense Rotations'}
            reason="Complete this to unlock advanced reads"
            lane="player"
            to={playerLessons[1] ? `/lessons/${playerLessons[1].id}` : '/player-iq'}
          />
          <RecommendationCard
            title={gmLessons[0]?.title ?? 'Evaluating Wing Prospects'}
            reason="High impact for your draft sim performance"
            lane="gm"
            to={gmLessons[0] ? `/lessons/${gmLessons[0].id}` : '/gm-iq'}
          />
        </div>
      </section>

      {featureFlags.onboardingEnabled && !onboardingState.completed && !onboardingState.skipped ? (
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-2 text-lg font-semibold">Recommended next step</h3>
          <p className="mb-4 text-sm text-muted-foreground">Finish onboarding to unlock the intended learning path before jumping into advanced scenarios.</p>
          <Link to="/onboarding">
            <Button>Start onboarding</Button>
          </Link>
        </section>
      ) : null}
    </div>
  );
}

interface IQCardProps {
  type: 'player' | 'coach' | 'gm';
  progress: number;
  nextLesson?: string;
  link: string;
}

function IQCard({ type, progress, nextLesson, link }: IQCardProps) {
  const config = {
    player: {
      title: 'Player IQ',
      subtitle: 'On-court reads & execution',
      color: 'var(--player-blue)',
      gradient: 'from-[rgba(74,144,226,0.2)] to-transparent',
    },
    coach: {
      title: 'Coach IQ',
      subtitle: 'Schemes & adjustments',
      color: 'var(--coach-purple)',
      gradient: 'from-[rgba(155,89,182,0.2)] to-transparent',
    },
    gm: {
      title: 'GM IQ',
      subtitle: 'Roster building & strategy',
      color: 'var(--gm-green)',
      gradient: 'from-[rgba(39,174,96,0.2)] to-transparent',
    },
  };
  const { title, subtitle, color, gradient } = config[type];

  return (
    <Link to={link}>
      <Card className={`cursor-pointer bg-gradient-to-br ${gradient} hover:scale-[1.02]`}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="mb-1 text-xl font-semibold" style={{ color }}>{title}</h3>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="text-2xl font-semibold opacity-80" style={{ color }}>{Math.round(progress)}%</div>
        </div>

        <div className="mb-4">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: color }}
            />
          </div>
        </div>

        {nextLesson ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Next: {nextLesson}</span>
            <Icon name="arrow" className="h-4 w-4" style={{ color }} />
          </div>
        ) : null}
      </Card>
    </Link>
  );
}

interface ChallengePreviewProps {
  title: string;
  description: string;
  streak: number;
  completed: boolean;
  onStart: () => void;
}

function ChallengePreview({ title, description, streak, completed, onStart }: ChallengePreviewProps) {
  return (
    <Card className="cursor-pointer hover:scale-[1.01]">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="mb-1 text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {streak > 0 ? (
          <div className="flex items-center gap-1 text-[var(--basketball-orange)]">
            <Icon name="trend" className="h-4 w-4" />
            <span className="text-sm">{streak} day streak</span>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onStart}
        className="mt-4 w-full rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90"
      >
        {completed ? 'Review Challenge' : 'Start Challenge'}
      </button>
    </Card>
  );
}

interface QuickNavCardProps {
  to: string;
  title: string;
  description: string;
  icon: IconName;
  accent: string;
}

function QuickNavCard({ to, title, description, icon, accent }: QuickNavCardProps) {
  return (
    <Link to={to}>
      <Card className="cursor-pointer text-center hover:scale-[1.02]">
      <div className="mb-3 flex justify-center">
        <Icon name={icon} className="h-8 w-8" style={{ color: accent }} />
      </div>
      <h3 className="mb-1 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      </Card>
    </Link>
  );
}

interface RecommendationCardProps {
  title: string;
  reason: string;
  lane: 'player' | 'coach' | 'gm';
  to: string;
}

function RecommendationCard({ title, reason, lane, to }: RecommendationCardProps) {
  const laneStyle = {
    player: { color: 'var(--cv-player)', backgroundColor: 'rgba(74, 144, 226, 0.12)' },
    coach: { color: 'var(--cv-coach)', backgroundColor: 'rgba(155, 89, 182, 0.12)' },
    gm: { color: 'var(--cv-gm)', backgroundColor: 'rgba(39, 174, 96, 0.12)' },
  }[lane];

  return (
    <Link to={to}>
      <Card className="cursor-pointer hover:scale-[1.01]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="mb-1 font-semibold">{title}</h4>
            <p className="text-sm text-muted-foreground">{reason}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded px-2 py-1 text-xs font-semibold uppercase" style={laneStyle}>
              {lane} IQ
            </span>
            <Icon name="arrow" className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

type IconName = 'play' | 'target' | 'book' | 'users' | 'arrow' | 'trend';

function Icon({
  name,
  className,
  style,
}: {
  name: IconName;
  className?: string;
  style?: React.CSSProperties;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    play: <path d="M8 5v14l11-7L8 5Z" />,
    target: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-2.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />,
    book: <path d="M5 4.5h10A4 4 0 0 1 19 8.5v11H9A4 4 0 0 0 5 15.5v-11Zm0 0A4 4 0 0 1 9 8.5h10" />,
    users: <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8.5-1a3.5 3.5 0 1 0 0-7M2.5 21c.9-4 2.7-6 5.5-6s4.6 2 5.5 6M14 15.5c2.5.4 4.2 2.2 5 5.5" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    trend: <path d="m4 16 5-5 4 4 7-7M14 8h6v6" />,
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      style={style}
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}
