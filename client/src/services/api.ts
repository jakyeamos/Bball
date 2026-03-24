// client/src/services/api.ts
// Phase 02-03: Added lesson list/detail and progress mutation fetch adapters.

import { TeamAggregation, LessonRecord, ProgressWritePayload } from '@nba-draft-sim/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ---------------------------------------------------------------------------
// Base fetch helper
// ---------------------------------------------------------------------------

/**
 * Normalized API error with status code so callers can branch on HTTP status
 * (e.g. 404 → "not found" message vs 500 → "unexpected error" message).
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly issues?: Array<{ path: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorData: { error?: string; issues?: Array<{ path: string; message: string }> };
    try {
      errorData = await response.json();
    } catch {
      errorData = {};
    }
    throw new ApiError(
      errorData.error ?? 'API request failed',
      response.status,
      errorData.issues
    );
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Learning API — lessons and progress
// ---------------------------------------------------------------------------

export interface LessonsListResponse {
  lessons: LessonRecord[];
}

export interface LessonDetailResponse {
  lesson: LessonRecord;
}

export interface ProgressResponse {
  success: boolean;
  progress: {
    lesson_id: string;
    completed: boolean;
    score?: number;
    user_id: string;
    updated_at: string;
  };
}

// ---------------------------------------------------------------------------
// Legacy + team API
// ---------------------------------------------------------------------------

export const apiService = {
  // ---- Team aggregation (existing) ----
  aggregateTeam: (
    playerIds: string[],
    teamId: string
  ): Promise<TeamAggregation> => {
    return fetchApi<TeamAggregation>('/api/team/aggregate', {
      method: 'POST',
      body: JSON.stringify({ playerIds, teamId }),
    });
  },

  // ---- Lesson list ----
  getLessons: (roleLens?: string): Promise<LessonsListResponse> => {
    const qs = roleLens ? `?role_lens=${encodeURIComponent(roleLens)}` : '';
    return fetchApi<LessonsListResponse>(`/api/lessons${qs}`);
  },

  // ---- Lesson detail ----
  getLesson: (id: string): Promise<LessonDetailResponse> => {
    return fetchApi<LessonDetailResponse>(`/api/lessons/${encodeURIComponent(id)}`);
  },

  // ---- Progress write ----
  writeProgress: (
    payload: ProgressWritePayload & { user_id?: string }
  ): Promise<ProgressResponse> => {
    return fetchApi<ProgressResponse>('/api/progress', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
