/**
 * client/src/features/learning/queries.ts
 * Phase 02-03: TanStack Query hooks for the Court Vision learning layer.
 *
 * Query keys are centralised here so invalidation calls elsewhere in the
 * codebase can reference them by name rather than duplicating string literals.
 *
 * Hooks exported:
 *   useLessons(roleLens?)      — list of lesson cards (optional filter by lens)
 *   useLesson(id)              — single lesson detail
 *   useWriteProgress()         — mutation that records/updates lesson progress
 *                                and invalidates the lesson list cache on success
 *
 * Error normalisation:
 *   ApiError instances surface their `.status` and `.issues` so consuming
 *   components can render field-level validation feedback or differentiate
 *   "not found" from "server error" without parsing error message strings.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { LessonRecord, ProgressWritePayload } from '@nba-draft-sim/shared';
import { apiService, ApiError, ProgressResponse } from '../../services/api';

// ---------------------------------------------------------------------------
// Query key factory — keeps cache key shapes consistent across the codebase
// ---------------------------------------------------------------------------

export const learningKeys = {
  all: ['learning'] as const,
  lessons: () => [...learningKeys.all, 'lessons'] as const,
  lessonsList: (roleLens?: string) =>
    [...learningKeys.lessons(), { roleLens }] as const,
  lessonDetail: (id: string) =>
    [...learningKeys.lessons(), 'detail', id] as const,
};

// ---------------------------------------------------------------------------
// useLessons — fetch lesson list, optionally filtered by role lens
// ---------------------------------------------------------------------------

export function useLessons(
  roleLens?: string
): UseQueryResult<LessonRecord[], ApiError> {
  return useQuery<LessonRecord[], ApiError>({
    queryKey: learningKeys.lessonsList(roleLens),
    queryFn: async () => {
      const res = await apiService.getLessons(roleLens);
      return res.lessons;
    },
  });
}

// ---------------------------------------------------------------------------
// useLesson — fetch a single lesson by ID
// ---------------------------------------------------------------------------

export function useLesson(
  id: string | undefined
): UseQueryResult<LessonRecord, ApiError> {
  return useQuery<LessonRecord, ApiError>({
    queryKey: learningKeys.lessonDetail(id ?? ''),
    queryFn: async () => {
      if (!id) throw new ApiError('No lesson ID provided', 400);
      const res = await apiService.getLesson(id);
      return res.lesson;
    },
    enabled: Boolean(id),
  });
}

// ---------------------------------------------------------------------------
// useWriteProgress — mutation for recording lesson completion
// ---------------------------------------------------------------------------

export type ProgressMutationVariables = ProgressWritePayload & {
  user_id?: string;
};

export function useWriteProgress(): UseMutationResult<
  ProgressResponse,
  ApiError,
  ProgressMutationVariables
> {
  const qc = useQueryClient();

  return useMutation<ProgressResponse, ApiError, ProgressMutationVariables>({
    mutationFn: (variables) => apiService.writeProgress(variables),
    onSuccess: (_data, variables) => {
      // Invalidate the lesson detail so the next open shows updated progress
      if (variables.lesson_id) {
        qc.invalidateQueries({
          queryKey: learningKeys.lessonDetail(variables.lesson_id),
        });
      }
      // Invalidate all lesson lists — completion state may affect ordering later
      qc.invalidateQueries({ queryKey: learningKeys.lessons() });
    },
  });
}
