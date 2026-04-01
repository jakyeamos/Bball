import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LessonProgressRecord, ProgressWritePayload } from '@nba-draft-sim/shared';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { listGuestProgress, upsertGuestProgress } from './progressStorage';

const progressKey = (userId: string | null, authMode: string) => ['lesson-progress', authMode, userId] as const;

export function useLessonProgress(lessonId?: string) {
  const { authMode, resolvedUserId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<LessonProgressRecord[]>({
    queryKey: progressKey(resolvedUserId, authMode),
    queryFn: async () => {
      if (!resolvedUserId) return [];
      if (authMode === 'guest') {
        return listGuestProgress();
      }
      const response = await apiService.listProgress();
      return response.progress;
    },
    enabled: Boolean(resolvedUserId),
  });

  const mutation = useMutation({
    mutationFn: async (payload: ProgressWritePayload) => {
      if (!resolvedUserId) {
        throw new Error('No user available for progress persistence.');
      }

      if (authMode === 'guest') {
        return {
          success: true,
          progress: upsertGuestProgress(resolvedUserId, payload),
        };
      }

      return apiService.writeProgress(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: progressKey(resolvedUserId, authMode) });
    },
  });

  const progress = lessonId
    ? query.data?.find((entry) => entry.lesson_id === lessonId) ?? null
    : null;

  return {
    ...query,
    progress,
    markComplete: (payload: ProgressWritePayload) => mutation.mutate(payload),
    markCompleteAsync: (payload: ProgressWritePayload) => mutation.mutateAsync(payload),
    isSaving: mutation.isPending,
    saveError: mutation.error,
  };
}
