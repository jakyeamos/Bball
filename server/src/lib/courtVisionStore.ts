import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import lessonsSeed from '../../data/lessons-seed.json';
import {
  BadgeRecord,
  DailyChallengeRecord,
  DailyChallengeResult,
  DiscussionComment,
  LessonProgressRecord,
  LessonRecord,
  OffseasonRunState,
  OnboardingResponse,
  RecapRecord,
  RecommendationCard,
  RoleLens,
  StreakState,
} from '../../../shared/schemas';

interface StoredUserProfile {
  email?: string;
  display_name?: string;
}

export interface CourtVisionStoreState {
  lessons: LessonRecord[];
  recaps: RecapRecord[];
  tags: string[];
  daily_challenges: DailyChallengeRecord[];
  progress_by_user: Record<string, LessonProgressRecord[]>;
  daily_results_by_user: Record<string, DailyChallengeResult[]>;
  badges_by_user: Record<string, BadgeRecord[]>;
  discussions_by_lesson: Record<string, DiscussionComment[]>;
  onboarding_by_user: Record<string, OnboardingResponse & { skipped?: boolean }>;
  friends_by_user: Record<string, Array<{ friend_id: string; display_name: string }>>;
  user_profiles: Record<string, StoredUserProfile>;
  offseason_runs_by_user: Record<string, OffseasonRunState[]>;
}

const STORE_PATH = process.env.COURT_VISION_STORE_PATH || path.join(os.tmpdir(), 'court-vision-store.json');

let cachedStore: CourtVisionStoreState | null = null;

function todayOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function defaultRecaps(): RecapRecord[] {
  return [
    {
      id: 'recap-player-spacing',
      title: 'Why One Extra Pass Changes Possessions',
      role_lens: 'player',
      summary: 'A quick recap on turning small advantages into clean shots.',
      body: 'The best offensive possessions are often decided one pass before the shot. This recap highlights how early help recognition creates better spacing outcomes.',
      tags: ['spacing', 'decision-making'],
      route: '/recaps/recap-player-spacing',
      published: true,
    },
    {
      id: 'recap-coach-shell',
      title: 'Defensive Shell Habits That Actually Travel',
      role_lens: 'coach',
      summary: 'Core rotation habits that hold up against modern spacing.',
      body: 'Shell concepts matter when they stay simple enough for players to execute under stress. The best teaching reduces hesitation on the weak side.',
      tags: ['shell-defense', 'rotations'],
      route: '/recaps/recap-coach-shell',
      published: true,
    },
    {
      id: 'recap-gm-risk',
      title: 'How Smart Teams Talk About Risk',
      role_lens: 'gm',
      summary: 'Risk is a roster-shape conversation, not just a scouting adjective.',
      body: 'Prospect variance, trade downside, and coaching fit all become more useful once they are framed around the organization’s real tolerance for misses.',
      tags: ['risk', 'team-building'],
      route: '/recaps/recap-gm-risk',
      published: true,
    },
  ];
}

function defaultDailyChallenges(): DailyChallengeRecord[] {
  return [
    {
      id: 'daily-player-tag',
      challenge_date: todayOffset(-1),
      title: 'Yesterday: Weak-Side Tag',
      prompt: 'When the low man tags the roller early, what is usually the cleanest first read?',
      choices: [
        { id: 'a', label: 'Force the pocket pass anyway' },
        { id: 'b', label: 'Kick out to the perimeter help target' },
        { id: 'c', label: 'Pick up the dribble and wait' },
      ],
      correct_choice_id: 'b',
      explanation: 'The tag defender has already committed to the paint, so the kickout punishes the help immediately.',
      role_lens: 'player',
      lesson_id: '10000000-0000-0000-0000-000000000001',
      tags: ['spacing', 'pick-and-roll'],
    },
    {
      id: 'daily-coach-timeout',
      challenge_date: todayOffset(0),
      title: 'Today: Timeout Or Trust',
      prompt: 'After the same defensive rotation error happens twice in a row, what should a coach prioritize?',
      choices: [
        { id: 'a', label: 'Save the timeout no matter what' },
        { id: 'b', label: 'Call timeout and fix the repeated coverage responsibility' },
        { id: 'c', label: 'Change nothing and blame execution later' },
      ],
      correct_choice_id: 'b',
      explanation: 'Repeated structural mistakes are exactly when a timeout creates value.',
      role_lens: 'coach',
      lesson_id: '10000000-0000-0000-0000-000000000005',
      tags: ['timeouts', 'game-management'],
    },
    {
      id: 'daily-gm-first',
      challenge_date: todayOffset(1),
      title: 'Tomorrow: Future First Value',
      prompt: 'When is trading a future first most defensible?',
      choices: [
        { id: 'a', label: 'Any time a recognizable veteran is available' },
        { id: 'b', label: 'When the incoming player solves a real playoff weakness with durable fit' },
        { id: 'c', label: 'Never, because picks are always more valuable than players' },
      ],
      correct_choice_id: 'b',
      explanation: 'A first should move when it buys a meaningful ceiling upgrade, not just a louder headline.',
      role_lens: 'gm',
      lesson_id: '10000000-0000-0000-0000-000000000008',
      tags: ['timeline', 'asset-management'],
    },
  ];
}

function defaultTags(lessons: LessonRecord[], recaps: RecapRecord[]): string[] {
  const tagSet = new Set<string>();

  lessons.forEach((lesson) => lesson.tags?.forEach((tag) => tagSet.add(tag)));
  recaps.forEach((recap) => recap.tags.forEach((tag) => tagSet.add(tag)));

  return [...tagSet].sort((a, b) => a.localeCompare(b));
}

function defaultStore(): CourtVisionStoreState {
  const lessons = (lessonsSeed as LessonRecord[]).map((lesson) => ({
    ...lesson,
    published: lesson.published ?? true,
  }));
  const recaps = defaultRecaps();

  return {
    lessons,
    recaps,
    tags: defaultTags(lessons, recaps),
    daily_challenges: defaultDailyChallenges(),
    progress_by_user: {},
    daily_results_by_user: {},
    badges_by_user: {},
    discussions_by_lesson: {},
    onboarding_by_user: {},
    friends_by_user: {},
    user_profiles: {},
    offseason_runs_by_user: {},
  };
}

function ensureStoreShape(raw: Partial<CourtVisionStoreState>): CourtVisionStoreState {
  const defaults = defaultStore();

  return {
    ...defaults,
    ...raw,
    lessons: Array.isArray(raw.lessons) ? raw.lessons : defaults.lessons,
    recaps: Array.isArray(raw.recaps) ? raw.recaps : defaults.recaps,
    tags: Array.isArray(raw.tags) ? raw.tags : defaults.tags,
    daily_challenges: Array.isArray(raw.daily_challenges)
      ? raw.daily_challenges
      : defaults.daily_challenges,
    progress_by_user: raw.progress_by_user ?? defaults.progress_by_user,
    daily_results_by_user:
      raw.daily_results_by_user ?? defaults.daily_results_by_user,
    badges_by_user: raw.badges_by_user ?? defaults.badges_by_user,
    discussions_by_lesson:
      raw.discussions_by_lesson ?? defaults.discussions_by_lesson,
    onboarding_by_user: raw.onboarding_by_user ?? defaults.onboarding_by_user,
    friends_by_user: raw.friends_by_user ?? defaults.friends_by_user,
    user_profiles: raw.user_profiles ?? defaults.user_profiles,
    offseason_runs_by_user:
      raw.offseason_runs_by_user ?? defaults.offseason_runs_by_user,
  };
}

export async function getStore(): Promise<CourtVisionStoreState> {
  if (cachedStore) {
    return cachedStore;
  }

  try {
    const contents = await fs.readFile(STORE_PATH, 'utf8');
    cachedStore = ensureStoreShape(
      JSON.parse(contents) as Partial<CourtVisionStoreState>
    );
    return cachedStore;
  } catch {
    cachedStore = defaultStore();
    await saveStore(cachedStore);
    return cachedStore;
  }
}

async function saveStore(state: CourtVisionStoreState): Promise<void> {
  cachedStore = state;
  await fs.writeFile(STORE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

export async function updateStore<T>(
  mutator: (draft: CourtVisionStoreState) => T | Promise<T>
): Promise<T> {
  const current = structuredClone(await getStore()) as CourtVisionStoreState;
  const result = await mutator(current);
  await saveStore(current);
  return result;
}

export function getChallengeForDate(
  state: CourtVisionStoreState,
  date: string
): DailyChallengeRecord | null {
  return state.daily_challenges.find((challenge) => challenge.challenge_date === date) ?? null;
}

export function getUserProgress(
  state: CourtVisionStoreState,
  userId: string
): LessonProgressRecord[] {
  return state.progress_by_user[userId] ?? [];
}

export function getUserDailyResults(
  state: CourtVisionStoreState,
  userId: string
): DailyChallengeResult[] {
  return state.daily_results_by_user[userId] ?? [];
}

export function getUserBadges(
  state: CourtVisionStoreState,
  userId: string
): BadgeRecord[] {
  return state.badges_by_user[userId] ?? [];
}

export function inferStreak(results: DailyChallengeResult[]): StreakState {
  if (results.length === 0) {
    return { current_streak: 0, best_streak: 0 };
  }

  const orderedDates = [...new Set(results.map((result) => result.challenge_date))].sort();
  let current = 0;
  let best = 0;
  let previous: Date | null = null;

  for (const dateString of orderedDates) {
    const currentDate = new Date(`${dateString}T00:00:00.000Z`);
    if (previous) {
      const diff = Math.round((currentDate.getTime() - previous.getTime()) / 86400000);
      current = diff === 1 ? current + 1 : 1;
    } else {
      current = 1;
    }

    if (current > best) {
      best = current;
    }

    previous = currentDate;
  }

  return {
    current_streak: current,
    best_streak: best,
    last_completed_date: orderedDates[orderedDates.length - 1],
  };
}

export function buildTrackBadge(roleLens: RoleLens, submittedAt: string): BadgeRecord {
  return {
    id: `first-${roleLens}-challenge`,
    label: `First ${roleLens.toUpperCase()} Daily`,
    description: `Completed your first ${roleLens === 'gm' ? 'GM' : roleLens} track daily challenge.`,
    category: 'track',
    unlocked_at: submittedAt,
  };
}

export function buildStreakBadge(days: number, submittedAt: string): BadgeRecord {
  return {
    id: `streak-${days}`,
    label: `${days}-Day Streak`,
    description: `Completed ${days} straight daily challenges.`,
    category: 'streak',
    unlocked_at: submittedAt,
  };
}

export function recommendationFromLesson(lesson: LessonRecord): RecommendationCard {
  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.takeaway || lesson.description,
    route: `/lessons/${lesson.id}`,
    role_lens: lesson.role_lens,
    kind: 'lesson',
  };
}
