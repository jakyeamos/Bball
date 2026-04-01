import React, { useDeferredValue } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { featureFlags } from '@nba-draft-sim/shared';
import { apiService } from '../services/api';
import { useLibraryFilters } from '../features/library/useLibraryFilters';

export function LibraryPage() {
  const { filters, setFilter, resetFilters } = useLibraryFilters();
  const deferredSearch = useDeferredValue(filters.search);

  const { data, isLoading } = useQuery({
    queryKey: ['library', { ...filters, search: deferredSearch }],
    queryFn: () =>
      apiService.getLibrary({
        ...filters,
        search: deferredSearch,
      }),
    enabled: featureFlags.contentLibraryEnabled,
  });

  if (!featureFlags.contentLibraryEnabled) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-3xl font-semibold text-cv-chalk mb-3">Library Coming Soon</h1>
        <p className="text-cv-chalk/70">The discovery library is still gated behind the current rollout flag.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">Content Library</p>
          <h1 className="text-4xl font-semibold text-cv-chalk">Find the next lesson or recap</h1>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="rounded-cv border border-cv-court/30 px-4 py-2 text-sm font-semibold text-cv-chalk"
        >
          Reset filters
        </button>
      </div>

      <div className="grid gap-4 rounded-cv border border-cv-court/20 bg-cv-steel p-5 lg:grid-cols-5">
        <input
          value={filters.search}
          onChange={(event) => setFilter('search', event.target.value)}
          placeholder="Search title, tag, or topic"
          className="rounded-cv border border-cv-court/20 bg-cv-navy/40 px-4 py-3 text-sm text-cv-chalk placeholder:text-cv-chalk/40 lg:col-span-2"
        />
        <select
          value={filters.role_lens}
          onChange={(event) => setFilter('role_lens', event.target.value)}
          className="rounded-cv border border-cv-court/20 bg-cv-navy/40 px-4 py-3 text-sm text-cv-chalk"
        >
          <option value="">All tracks</option>
          <option value="player">Player IQ</option>
          <option value="coach">Coach IQ</option>
          <option value="gm">GM IQ</option>
        </select>
        <select
          value={filters.difficulty}
          onChange={(event) => setFilter('difficulty', event.target.value)}
          className="rounded-cv border border-cv-court/20 bg-cv-navy/40 px-4 py-3 text-sm text-cv-chalk"
        >
          <option value="">Any difficulty</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select
          value={filters.format}
          onChange={(event) => setFilter('format', event.target.value)}
          className="rounded-cv border border-cv-court/20 bg-cv-navy/40 px-4 py-3 text-sm text-cv-chalk"
        >
          <option value="">Any format</option>
          <option value="film">Film</option>
          <option value="pause_predict">Pause & Predict</option>
          <option value="scenario">Scenario</option>
          <option value="article">Article</option>
        </select>
        <select
          value={filters.tag}
          onChange={(event) => setFilter('tag', event.target.value)}
          className="rounded-cv border border-cv-court/20 bg-cv-navy/40 px-4 py-3 text-sm text-cv-chalk lg:col-span-2"
        >
          <option value="">Any tag</option>
          {data?.available_tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-8 flex items-center justify-between text-sm text-cv-chalk/60">
        <span>{data?.items.length ?? 0} results</span>
        <span>Combined filters stay active until you reset them.</span>
      </div>

      {isLoading ? (
        <p className="mt-8 text-cv-chalk/60">Loading library...</p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {data?.items.map((item) => (
            <Link
              key={`${item.content_type}-${item.id}`}
              to={item.route}
              className="rounded-cv border border-cv-court/20 bg-cv-steel p-5 transition-colors hover:border-cv-accent/60"
            >
              <div className="flex flex-wrap gap-2 mb-3 text-xs uppercase tracking-[0.2em] text-cv-accent">
                <span>{item.content_type}</span>
                <span>{item.role_lens}</span>
                {item.difficulty ? <span>{item.difficulty}</span> : null}
              </div>
              <h2 className="text-2xl font-semibold text-cv-chalk mb-2">{item.title}</h2>
              <p className="text-sm leading-6 text-cv-chalk/70 mb-4">{item.summary}</p>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-cv-court/20 px-3 py-1 text-xs text-cv-chalk/60">
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
