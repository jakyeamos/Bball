import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { featureFlags, LessonRecord } from '@nba-draft-sim/shared';
import { apiService } from '../../services/api';
import { LessonEditorForm } from '../../components/admin/LessonEditorForm';

function buildDraftLesson(): LessonRecord {
  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : '10000000-0000-0000-0000-000000009999';

  return {
    id: randomId,
    title: '',
    role_lens: 'player',
    difficulty: 'beginner',
    description: '',
    interaction_type: 'article',
    tags: [],
    published: false,
  };
}

export function AdminLessonsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['admin-lessons'],
    queryFn: apiService.getAdminLessons,
    enabled: featureFlags.cmsLessonAuthoringEnabled,
  });

  if (!featureFlags.cmsLessonAuthoringEnabled) {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-cv-chalk/70">Lesson authoring is currently disabled.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-4xl font-semibold text-cv-chalk mb-6">Admin Lessons</h1>
      <LessonEditorForm
        initialLesson={buildDraftLesson()}
        onSave={async (lesson) => {
          await apiService.saveAdminLesson(lesson);
          queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
        }}
      />

      <div className="mt-8 grid gap-4">
        {data?.lessons.map((lesson) => (
          <div key={lesson.id} className="rounded-cv border border-cv-court/20 bg-cv-steel p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-cv-chalk">{lesson.title}</h2>
                <p className="text-sm text-cv-chalk/60">{lesson.description}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await apiService.setLessonPublished(lesson.id, !(lesson.published ?? false));
                  queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
                }}
                className="rounded-cv border border-cv-court/20 px-4 py-2 text-sm font-semibold text-cv-chalk"
              >
                {lesson.published ? 'Unpublish' : 'Publish'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
