import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { apiService } from '../services/api';

export function LessonDiscussionPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();

  const discussionQuery = useQuery({
    queryKey: ['discussion', lessonId],
    queryFn: () => apiService.getDiscussion(lessonId!),
    enabled: Boolean(lessonId),
  });

  const postMutation = useMutation({
    mutationFn: (body: string) => apiService.postDiscussion(lessonId!, body),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['discussion', lessonId] });
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">Lesson Discussion</p>
        <h1 className="text-4xl font-semibold text-cv-chalk">Text-only film room notes</h1>
        <p className="text-cv-chalk/70 mt-3">
          Keep this practical. No ranking, no feed mechanics, just observations and questions.
        </p>
      </div>

      <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6 mb-6">
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={4}
          placeholder="What did you notice in this lesson?"
          className="w-full rounded-cv border border-cv-court/20 bg-cv-navy/40 px-4 py-3 text-sm text-cv-chalk placeholder:text-cv-chalk/40"
        />
        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => postMutation.mutate(comment)}
            disabled={!comment.trim() || postMutation.isPending}
            className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {postMutation.isPending ? 'Posting...' : 'Post Comment'}
          </button>
          <Link to={`/lessons/${lessonId}`} className="text-sm text-cv-chalk/60 hover:text-cv-chalk">
            Back to lesson
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {discussionQuery.data?.comments.map((entry) => (
          <div key={entry.id} className="rounded-cv border border-cv-court/20 bg-cv-steel p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-cv-chalk">{entry.author_label}</span>
              <span className="text-xs text-cv-chalk/50">
                {new Date(entry.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-sm leading-6 text-cv-chalk/75">{entry.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
