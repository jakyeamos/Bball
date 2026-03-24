/**
 * client/src/pages/LessonPage.tsx
 * Phase 02-03: Lesson detail page using TanStack Query.
 *
 * Reads :lessonId from the URL, fetches the lesson with useLesson(), and
 * renders loading / error / content states. Progress is submitted via
 * useWriteProgress() when the user clicks "Mark Complete".
 *
 * Route: /lessons/:lessonId
 */

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLesson, useWriteProgress } from '../features/learning/queries';
import { ApiError } from '../services/api';

function roleLensLabel(lens: string): string {
  const labels: Record<string, string> = {
    player: 'Player IQ',
    coach: 'Coach IQ',
    gm: 'GM IQ',
  };
  return labels[lens] ?? lens;
}

function difficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  };
  return labels[difficulty] ?? difficulty;
}

export function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: lesson, isLoading, error } = useLesson(lessonId);
  const writeProgress = useWriteProgress();

  function handleMarkComplete() {
    if (!lessonId) return;
    writeProgress.mutate({
      lesson_id: lessonId,
      completed: true,
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cv-navy flex items-center justify-center">
        <p className="text-cv-chalk/60 text-sm">Loading lesson...</p>
      </div>
    );
  }

  if (error) {
    const is404 = error instanceof ApiError && error.status === 404;
    return (
      <div className="min-h-screen bg-cv-navy flex flex-col items-center justify-center gap-4">
        <p className="text-cv-chalk font-semibold">
          {is404 ? 'Lesson not found.' : 'Failed to load lesson.'}
        </p>
        <Link to="/" className="text-cv-accent text-sm hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="min-h-screen bg-cv-navy">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <Link to="/" className="text-cv-accent text-sm hover:underline mb-6 inline-block">
          Home
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-cv-accent">
              {roleLensLabel(lesson.role_lens)}
            </span>
            <span className="text-cv-chalk/40 text-xs">•</span>
            <span className="text-xs text-cv-chalk/50">
              {difficultyLabel(lesson.difficulty)}
            </span>
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-cv-chalk mb-4">
            {lesson.title}
          </h1>
          <p className="text-cv-chalk/70 text-base leading-relaxed">
            {lesson.description}
          </p>
        </div>

        {/* Content embed placeholder */}
        {lesson.content_url ? (
          <div className="aspect-video bg-cv-steel rounded-cv overflow-hidden mb-8">
            <iframe
              src={lesson.content_url}
              title={lesson.title}
              className="w-full h-full"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="bg-cv-steel border border-cv-court/20 rounded-cv p-8 text-center mb-8">
            <p className="text-cv-chalk/40 text-sm">
              Full lesson content coming in Phase 4.
            </p>
          </div>
        )}

        {/* Mark complete action */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleMarkComplete}
            disabled={writeProgress.isPending || writeProgress.isSuccess}
            className="bg-cv-accent hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold rounded-cv px-6 py-2 transition-colors"
          >
            {writeProgress.isPending
              ? 'Saving...'
              : writeProgress.isSuccess
              ? 'Completed!'
              : 'Mark Complete'}
          </button>

          {writeProgress.isError && (
            <p className="text-red-400 text-sm">
              {writeProgress.error instanceof ApiError
                ? writeProgress.error.message
                : 'Failed to save progress.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
