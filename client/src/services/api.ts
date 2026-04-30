import {
  AdvancedModuleRecommendation,
  BadgeRecord,
  ContentLibraryItem,
  DailyChallengeRecord,
  DailyChallengeResult,
  DiscussionComment,
  DraftTeachingMoment,
  LessonProgressRecord,
  LessonRecord,
  OffseasonDraftPickResult,
  OffseasonFreeAgencySigning,
  OffseasonFreeAgencyTarget,
  OffseasonCoachProfile,
  OffseasonRecapReport,
  OffseasonRunState,
  OffseasonScoutingProspect,
  OffseasonTeamSummary,
  OffseasonTradeProposal,
  OnboardingResponse,
  ProfileResponse,
  ProgressWritePayload,
  RecommendationCard,
  RecapRecord,
  TeamAggregation,
} from '@nba-draft-sim/shared';
import supabase from '../lib/supabaseClient';
import { getGuestUserId } from '../lib/userIdentity';
import { buildApiUrl } from '../lib/runtimeConfig';

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

async function buildRequestHeaders(
  incoming?: HeadersInit
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (incoming instanceof Headers) {
    incoming.forEach((value, key) => {
      headers[key] = value;
    });
  } else if (Array.isArray(incoming)) {
    for (const [key, value] of incoming) {
      headers[key] = value;
    }
  } else if (incoming) {
    Object.assign(headers, incoming);
  }

  headers['x-user-id'] = getGuestUserId();

  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    const userId = data.session?.user.id;

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    if (userId) {
      headers['x-user-id'] = userId;
    }
  }

  return headers;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(buildApiUrl(endpoint), {
    ...options,
    headers: await buildRequestHeaders(options.headers),
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

export interface LessonsListResponse {
  lessons: LessonRecord[];
}

export interface LessonDetailResponse {
  lesson: LessonRecord;
}

export interface ProgressResponse {
  success: boolean;
  progress: LessonProgressRecord;
}

export interface ProgressListResponse {
  progress: LessonProgressRecord[];
}

export interface LibraryResponse {
  items: ContentLibraryItem[];
  available_tags: string[];
  recaps: RecapRecord[];
}

export interface RecommendationsResponse {
  recommendations: RecommendationCard[];
}

export interface DailyChallengeResponse {
  challenge: DailyChallengeRecord | null;
}

export interface DailyChallengeSubmitPayload {
  challenge_id: string;
  selected_choice_id: string;
}

export interface LeaderboardResponse {
  friends: Array<{ friend_id: string; display_name: string; completed: boolean }>;
}

export interface DiscussionResponse {
  comments: DiscussionComment[];
}

export interface AdminLessonsResponse {
  lessons: LessonRecord[];
}

export interface AdminTagsResponse {
  tags: string[];
}

export interface DraftTeachingResponse {
  moments: DraftTeachingMoment[];
}

export interface OffseasonTeamsResponse {
  teams: OffseasonTeamSummary[];
}

export interface OffseasonRunResponse {
  run: OffseasonRunState | null;
}

export interface OffseasonCoachingMarketResponse {
  run: OffseasonRunState | null;
  coaches: OffseasonCoachProfile[];
}

export interface OffseasonScoutingBoardResponse {
  run: OffseasonRunState | null;
  prospects: OffseasonScoutingProspect[];
}

export interface OffseasonTradeProposalResponse {
  run: OffseasonRunState | null;
  proposal: OffseasonTradeProposal;
}

export interface OffseasonDraftPickResponse {
  run: OffseasonRunState | null;
  pick: OffseasonDraftPickResult;
}

export interface OffseasonFreeAgencyTargetsResponse {
  run: OffseasonRunState | null;
  targets: OffseasonFreeAgencyTarget[];
}

export interface OffseasonFreeAgencyOfferResponse {
  run: OffseasonRunState | null;
  signing: OffseasonFreeAgencySigning;
}

export interface OffseasonRecapResponse {
  run: OffseasonRunState | null;
  recap: OffseasonRecapReport;
}

export interface AdvancedModulesResponse {
  modules: AdvancedModuleRecommendation[];
}

type LessonFilters = {
  role_lens?: string;
  difficulty?: string;
  format?: string;
  tag?: string;
  search?: string;
  published_only?: boolean;
};

function buildQuery(params: Record<string, string | boolean | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const apiService = {
  aggregateTeam: (
    playerIds: string[],
    teamId: string
  ): Promise<TeamAggregation> => {
    return fetchApi<TeamAggregation>('/api/team/aggregate', {
      method: 'POST',
      body: JSON.stringify({ playerIds, teamId }),
    });
  },

  getLessons: (filters: string | LessonFilters = {}): Promise<LessonsListResponse> => {
    const normalizedFilters =
      typeof filters === 'string' ? { role_lens: filters } : filters;
    return fetchApi<LessonsListResponse>(
      `/api/lessons${buildQuery(normalizedFilters)}`
    );
  },

  getLesson: (id: string): Promise<LessonDetailResponse> => {
    return fetchApi<LessonDetailResponse>(`/api/lessons/${encodeURIComponent(id)}`);
  },

  writeProgress: (
    payload: ProgressWritePayload & { user_id?: string }
  ): Promise<ProgressResponse> => {
    return fetchApi<ProgressResponse>('/api/progress', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listProgress: (): Promise<ProgressListResponse> => {
    return fetchApi<ProgressListResponse>('/api/progress');
  },

  getLibrary: (filters: LessonFilters = {}): Promise<LibraryResponse> => {
    return fetchApi<LibraryResponse>(
      `/api/library${buildQuery(filters)}`
    );
  },

  getRecommendations: (
    payload: OnboardingResponse
  ): Promise<RecommendationsResponse> => {
    return fetchApi<RecommendationsResponse>('/api/recommendations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getDailyChallenge: (date?: string): Promise<DailyChallengeResponse> => {
    return fetchApi<DailyChallengeResponse>(
      `/api/daily-challenge${buildQuery({ date })}`
    );
  },

  submitDailyChallenge: (
    payload: DailyChallengeSubmitPayload
  ): Promise<DailyChallengeResult> => {
    return fetchApi<DailyChallengeResult>('/api/daily-challenge/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getLeaderboard: (date?: string): Promise<LeaderboardResponse> => {
    return fetchApi<LeaderboardResponse>(
      `/api/leaderboard${buildQuery({ date })}`
    );
  },

  getProfile: (): Promise<ProfileResponse> => {
    return fetchApi<ProfileResponse>('/api/profile');
  },

  getDiscussion: (lessonId: string): Promise<DiscussionResponse> => {
    return fetchApi<DiscussionResponse>(`/api/discussion/${encodeURIComponent(lessonId)}`);
  },

  postDiscussion: (
    lessonId: string,
    body: string
  ): Promise<DiscussionComment> => {
    return fetchApi<DiscussionComment>(`/api/discussion/${encodeURIComponent(lessonId)}`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },

  getDraftTeaching: (): Promise<DraftTeachingResponse> => {
    return fetchApi<DraftTeachingResponse>('/api/draft-teaching');
  },

  getOffseasonTeams: (): Promise<OffseasonTeamsResponse> => {
    return fetchApi<OffseasonTeamsResponse>('/api/offseason/runs/teams');
  },

  getActiveOffseasonRun: (runId?: string): Promise<OffseasonRunResponse> => {
    return fetchApi<OffseasonRunResponse>(
      `/api/offseason/runs/active${buildQuery({ run_id: runId })}`
    );
  },

  createOffseasonRun: (seasonYear: number): Promise<OffseasonRunResponse> => {
    return fetchApi<OffseasonRunResponse>('/api/offseason/runs', {
      method: 'POST',
      body: JSON.stringify({ season_year: seasonYear }),
    });
  },

  saveTeamContext: (
    runId: string,
    teamId: number
  ): Promise<OffseasonRunResponse> => {
    return fetchApi<OffseasonRunResponse>(
      `/api/offseason/runs/${encodeURIComponent(runId)}/team-context`,
      {
        method: 'POST',
        body: JSON.stringify({ team_id: teamId }),
      }
    );
  },

  getOffseasonCoachingMarket: (
    runId: string
  ): Promise<OffseasonCoachingMarketResponse> => {
    return fetchApi<OffseasonCoachingMarketResponse>(
      `/api/offseason/runs/${encodeURIComponent(runId)}/coaching-market`
    );
  },

  hireOffseasonCoach: (
    runId: string,
    coachId: string
  ): Promise<OffseasonRunResponse> => {
    return fetchApi<OffseasonRunResponse>(
      `/api/offseason/runs/${encodeURIComponent(runId)}/coaching-market/hire`,
      {
        method: 'POST',
        body: JSON.stringify({
          coach_id: coachId,
        }),
      }
    );
  },

  getOffseasonScoutingBoard: (
    runId: string
  ): Promise<OffseasonScoutingBoardResponse> => {
    return fetchApi<OffseasonScoutingBoardResponse>(
      `/api/offseason/runs/${encodeURIComponent(runId)}/scouting-board`
    );
  },

  updateOffseasonScoutingBoard: (
    runId: string,
    rankedPlayerIds: number[]
  ): Promise<OffseasonScoutingBoardResponse> => {
    return fetchApi<OffseasonScoutingBoardResponse>(
      `/api/offseason/runs/${encodeURIComponent(runId)}/scouting-board/rank`,
      {
        method: 'POST',
        body: JSON.stringify({
          ranked_player_ids: rankedPlayerIds,
        }),
      }
    );
  },

  submitOffseasonTradeProposal: (
    runId: string,
    payload: {
      offered_player_ids: number[];
      offered_pick_ids: string[];
      requested_player_ids: number[];
      requested_pick_ids: string[];
      decision: 'accepted' | 'rejected';
    }
  ): Promise<OffseasonTradeProposalResponse> => {
    return fetchApi<OffseasonTradeProposalResponse>(
      `/api/offseason/runs/${encodeURIComponent(runId)}/trade-market/proposals`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  submitOffseasonDraftPick: (
    runId: string,
    playerId: number
  ): Promise<OffseasonDraftPickResponse> => {
    return fetchApi<OffseasonDraftPickResponse>(
      `/api/offseason/runs/${encodeURIComponent(runId)}/draft-night/picks`,
      {
        method: 'POST',
        body: JSON.stringify({ player_id: playerId }),
      }
    );
  },

  getOffseasonFreeAgencyTargets: (
    runId: string
  ): Promise<OffseasonFreeAgencyTargetsResponse> => {
    return fetchApi<OffseasonFreeAgencyTargetsResponse>(
      `/api/offseason/runs/${encodeURIComponent(runId)}/free-agency/targets`
    );
  },

  submitOffseasonFreeAgencyOffer: (
    runId: string,
    payload: {
      player_id: number;
      contract_millions: number;
      decision: 'signed' | 'declined';
    }
  ): Promise<OffseasonFreeAgencyOfferResponse> => {
    return fetchApi<OffseasonFreeAgencyOfferResponse>(
      `/api/offseason/runs/${encodeURIComponent(runId)}/free-agency/offers`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  getOffseasonRecap: (
    runId: string
  ): Promise<OffseasonRecapResponse> => {
    return fetchApi<OffseasonRecapResponse>(
      `/api/offseason/runs/${encodeURIComponent(runId)}/recap`
    );
  },

  transitionOffseasonRun: (
    runId: string,
    expectedPhase: OffseasonRunState['phase'],
    nextPhase: OffseasonRunState['phase']
  ): Promise<OffseasonRunResponse> => {
    return fetchApi<OffseasonRunResponse>(
      `/api/offseason/runs/${encodeURIComponent(runId)}/transition`,
      {
        method: 'POST',
        body: JSON.stringify({
          expected_phase: expectedPhase,
          next_phase: nextPhase,
        }),
      }
    );
  },

  getAdvancedModules: (): Promise<AdvancedModulesResponse> => {
    return fetchApi<AdvancedModulesResponse>('/api/recommendations/advanced');
  },

  getAdminLessons: (): Promise<AdminLessonsResponse> => {
    return fetchApi<AdminLessonsResponse>('/api/admin/lessons');
  },

  saveAdminLesson: (lesson: LessonRecord): Promise<LessonRecord> => {
    return fetchApi<LessonRecord>('/api/admin/lessons', {
      method: 'POST',
      headers: { 'x-cv-admin': 'true' },
      body: JSON.stringify({ lesson }),
    });
  },

  setLessonPublished: (lessonId: string, published: boolean): Promise<LessonRecord> => {
    return fetchApi<LessonRecord>(`/api/admin/lessons/${encodeURIComponent(lessonId)}/publish`, {
      method: 'POST',
      headers: { 'x-cv-admin': 'true' },
      body: JSON.stringify({ published }),
    });
  },

  getAdminTags: (): Promise<AdminTagsResponse> => {
    return fetchApi<AdminTagsResponse>('/api/admin/tags', {
      headers: { 'x-cv-admin': 'true' },
    });
  },

  saveTag: (name: string, previousName?: string): Promise<{ tags: string[] }> => {
    return fetchApi<{ tags: string[] }>('/api/admin/tags', {
      method: 'POST',
      headers: { 'x-cv-admin': 'true' },
      body: JSON.stringify({ name, previous_name: previousName }),
    });
  },

  deleteTag: (name: string): Promise<{ tags: string[] }> => {
    return fetchApi<{ tags: string[] }>(`/api/admin/tags/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: { 'x-cv-admin': 'true' },
    });
  },

  getBadges: async (): Promise<BadgeRecord[]> => {
    const profile = await apiService.getProfile();
    return profile.badges;
  },
};
