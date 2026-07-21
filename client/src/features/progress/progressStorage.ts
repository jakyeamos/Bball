import { LessonProgressRecord, ProgressWritePayload } from '@nba-draft-sim/shared';

const GUEST_PROGRESS_KEY = 'court-vision.guest-progress';

function readGuestProgressMap(): Record<string, LessonProgressRecord> {
  if (typeof window === 'undefined') return {};

  const raw = window.localStorage.getItem(GUEST_PROGRESS_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<string, LessonProgressRecord>;
  } catch {
    return {};
  }
}

function writeGuestProgressMap(map: Record<string, LessonProgressRecord>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(map));
}

export function listGuestProgress(): LessonProgressRecord[] {
  return Object.values(readGuestProgressMap()).sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at)
  );
}

export function upsertGuestProgress(
  userId: string,
  payload: ProgressWritePayload
): LessonProgressRecord {
  const map = readGuestProgressMap();
  const existing = map[payload.lesson_id];
  const now = new Date().toISOString();

  const next: LessonProgressRecord = {
    user_id: userId,
    lesson_id: payload.lesson_id,
    completed: existing?.completed || payload.completed,
    score: payload.score ?? existing?.score,
    attempts: existing ? existing.attempts + 1 : 1,
    updated_at: now,
    last_attempted_at: now,
  };

  map[payload.lesson_id] = next;
  writeGuestProgressMap(map);
  return next;
}
