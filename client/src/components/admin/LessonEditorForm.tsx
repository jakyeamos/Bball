import React, { useState } from 'react';
import { LessonRecord } from '@nba-draft-sim/shared';

interface LessonEditorFormProps {
  initialLesson: LessonRecord;
  onSave: (lesson: LessonRecord) => Promise<void> | void;
}

export function LessonEditorForm({ initialLesson, onSave }: LessonEditorFormProps) {
  const [lesson, setLesson] = useState<LessonRecord>(initialLesson);

  return (
    <div className="grid gap-4 rounded-cv border border-cv-court/20 bg-cv-steel p-5">
      <input
        value={lesson.title}
        onChange={(event) => setLesson((current) => ({ ...current, title: event.target.value }))}
        placeholder="Lesson title"
        className="rounded-cv border border-cv-court/20 bg-cv-navy/40 px-4 py-3 text-cv-chalk"
      />
      <textarea
        value={lesson.description}
        onChange={(event) => setLesson((current) => ({ ...current, description: event.target.value }))}
        rows={4}
        placeholder="Lesson description"
        className="rounded-cv border border-cv-court/20 bg-cv-navy/40 px-4 py-3 text-cv-chalk"
      />
      <input
        value={(lesson.tags ?? []).join(', ')}
        onChange={(event) =>
          setLesson((current) => ({
            ...current,
            tags: event.target.value
              .split(',')
              .map((entry) => entry.trim())
              .filter(Boolean),
          }))
        }
        placeholder="comma,separated,tags"
        className="rounded-cv border border-cv-court/20 bg-cv-navy/40 px-4 py-3 text-cv-chalk"
      />
      <button
        type="button"
        onClick={() => onSave(lesson)}
        className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
      >
        Save lesson
      </button>
    </div>
  );
}
