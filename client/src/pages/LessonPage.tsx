import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { featureFlags } from '@nba-draft-sim/shared';
import { useLesson } from '../features/learning/queries';
import { useLessonProgress } from '../features/progress/useLessonProgress';
import { ApiError } from '../services/api';
import { LessonCard } from '../components/lesson/LessonCard';
import { FilmBreakdown } from '../components/lesson/FilmBreakdown';
import type { FilmBreakdownRef } from '../components/lesson/FilmBreakdown';
import { AnnotationRail } from '../components/lesson/AnnotationRail';
import { PausePredict } from '../components/lesson/PausePredict';
import { ScenarioSimulation } from '../components/lesson/ScenarioSimulation';
import { LearnMore } from '../components/lesson/LearnMore';

function roleLensLabel(lens: string): string {
  return lens === 'gm' ? 'GM IQ' : `${lens.charAt(0).toUpperCase()}${lens.slice(1)} IQ`;
}

export function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: lesson, isLoading, error } = useLesson(lessonId);
  const { progress, markComplete, isSaving } = useLessonProgress(lessonId);
  const [currentTime, setCurrentTime] = React.useState(0);
  const filmRef = React.useRef<FilmBreakdownRef | null>(null);

  const completionLabel = useMemo(() => {
    if (!progress?.completed) return 'Mark lesson complete';
    if (typeof progress.score === 'number') return `Completed • ${progress.score}%`;
    return 'Completed';
  }, [progress?.completed, progress?.score]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-cv-chalk/70">
        Loading lesson...
      </div>
    );
  }

  if (error) {
    const is404 = error instanceof ApiError && error.status === 404;
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-cv-chalk font-semibold mb-4">
          {is404 ? 'Lesson not found.' : 'Failed to load lesson.'}
        </p>
        <Link to="/library" className="text-cv-accent hover:underline">
          Back to library
        </Link>
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-wrap items-center gap-3 text-sm text-cv-chalk/60">
        <Link to="/" className="hover:text-cv-chalk">Home</Link>
        <span>•</span>
        <Link to="/library" className="hover:text-cv-chalk">Library</Link>
        <span>•</span>
        <span>{roleLensLabel(lesson.role_lens)}</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <LessonCard lesson={lesson} />

          {featureFlags.lessonRuntimeEnabled ? (
            <>
              {lesson.interaction_type === 'film' && lesson.content_url ? (
                <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
                  <FilmBreakdown
                    ref={filmRef}
                    contentUrl={lesson.content_url}
                    onTimeUpdate={setCurrentTime}
                  />
                  <AnnotationRail
                    annotations={lesson.annotations}
                    currentTime={currentTime}
                    onSeek={(timestamp) => filmRef.current?.seekTo(timestamp)}
                  />
                </div>
              ) : null}

              {lesson.interaction_type === 'pause_predict' && lesson.pause_predict ? (
                <PausePredict
                  title={lesson.title}
                  contentUrl={lesson.content_url}
                  interaction={lesson.pause_predict}
                  onComplete={(score) =>
                    markComplete({
                      lesson_id: lesson.id,
                      completed: true,
                      score,
                    })
                  }
                />
              ) : null}

              {lesson.interaction_type === 'scenario' && lesson.scenario ? (
                <ScenarioSimulation
                  scenario={lesson.scenario}
                  onComplete={(score) =>
                    markComplete({
                      lesson_id: lesson.id,
                      completed: true,
                      score,
                    })
                  }
                />
              ) : null}

              {featureFlags.learnMoreEnabled && lesson.learn_more?.length ? (
                <LearnMore sections={lesson.learn_more} />
              ) : null}
            </>
          ) : (
            <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6 text-sm text-cv-chalk/70">
              Lesson runtime is currently hidden behind the active feature flag.
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">Lesson Progress</p>
            <h2 className="text-2xl font-semibold text-cv-chalk mb-3">{completionLabel}</h2>
            <p className="text-sm leading-6 text-cv-chalk/70 mb-4">
              Save completion and accuracy so Court Vision can recommend the right next rep.
            </p>
            <button
              type="button"
              onClick={() =>
                markComplete({
                  lesson_id: lesson.id,
                  completed: true,
                  score: progress?.score,
                })
              }
              disabled={isSaving}
              className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : completionLabel}
            </button>
          </div>

          <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">Lesson Notes</p>
            <p className="text-sm leading-6 text-cv-chalk/70 mb-4">
              {lesson.answer_key || lesson.takeaway || lesson.description}
            </p>
            <Link to={`/lessons/${lesson.id}/discussion`} className="text-sm font-semibold text-cv-accent hover:underline">
              Open text-only discussion
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
