import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export function RecapPage() {
  const { recapId } = useParams<{ recapId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['recap', recapId],
    queryFn: async () => {
      const response = await apiService.getLibrary();
      return response.recaps.find((recap) => recap.id === recapId) ?? null;
    },
    enabled: Boolean(recapId),
  });

  if (isLoading) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-cv-chalk/70">Loading recap...</div>;
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-cv-chalk mb-4">Recap not found.</p>
        <Link to="/library" className="text-cv-accent hover:underline">
          Back to library
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-3">{data.role_lens} recap</p>
      <h1 className="text-4xl font-semibold text-cv-chalk mb-4">{data.title}</h1>
      <p className="text-lg text-cv-chalk/70 mb-8">{data.summary}</p>
      <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-6">
        <p className="text-sm leading-7 text-cv-chalk/80">{data.body}</p>
      </div>
    </div>
  );
}
