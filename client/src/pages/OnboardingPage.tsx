import React, { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { OnboardingResponse, RecommendationCard, featureFlags } from '@nba-draft-sim/shared';
import { apiService } from '../services/api';
import { buildOnboardingRecommendations } from '../features/onboarding/recommendationEngine';
import { completeOnboarding, skipOnboarding } from '../features/onboarding/onboardingStorage';
import { isValidOnboardingResponse } from '../features/onboarding/onboardingSchema';

const INITIAL_FORM: OnboardingResponse = {
  favorite_team: '',
  knowledge_level: 'new',
  improvement_goal: 'player',
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<OnboardingResponse>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [resolvedRecommendations, setResolvedRecommendations] = useState<RecommendationCard[]>([]);

  const lessonsQuery = useQuery({
    queryKey: ['onboarding-lessons'],
    queryFn: () => apiService.getLessons(),
    enabled: featureFlags.onboardingEnabled,
  });
  const challengeQuery = useQuery({
    queryKey: ['onboarding-daily'],
    queryFn: () => apiService.getDailyChallenge(),
    enabled: featureFlags.onboardingEnabled,
  });

  const recommendations = useMemo(() => {
    if (resolvedRecommendations.length > 0) {
      return resolvedRecommendations;
    }
    return buildOnboardingRecommendations(
      form,
      lessonsQuery.data?.lessons ?? [],
      challengeQuery.data?.challenge ?? null
    );
  }, [challengeQuery.data?.challenge, form, lessonsQuery.data?.lessons, resolvedRecommendations]);

  const recommendationsMutation = useMutation({
    mutationFn: apiService.getRecommendations,
    onSuccess: (response) => {
      setResolvedRecommendations(response.recommendations);
      completeOnboarding(form);
      setSubmitted(true);
    },
  });

  if (!featureFlags.onboardingEnabled) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">First Visit</p>
      <h1 className="text-4xl font-semibold text-cv-chalk mb-4">Set your starting point</h1>
      <p className="text-cv-chalk/70 mb-8">
        This flow suggests exactly three starter lessons and one benchmark daily challenge. You can skip it and browse freely.
      </p>

      {!submitted ? (
        <div className="grid gap-4 rounded-cv border border-cv-court/20 bg-cv-steel p-6">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-cv-chalk">Favorite team</span>
            <input
              value={form.favorite_team}
              onChange={(event) => setForm((current) => ({ ...current, favorite_team: event.target.value }))}
              placeholder="Boston Celtics"
              className="rounded-cv border border-cv-court/20 bg-cv-navy/40 px-4 py-3 text-cv-chalk placeholder:text-cv-chalk/40"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-cv-chalk">Current knowledge level</span>
            <select
              value={form.knowledge_level}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  knowledge_level: event.target.value as OnboardingResponse['knowledge_level'],
                }))
              }
              className="rounded-cv border border-cv-court/20 bg-cv-navy/40 px-4 py-3 text-cv-chalk"
            >
              <option value="new">New</option>
              <option value="growing">Growing</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-cv-chalk">Main improvement goal</span>
            <select
              value={form.improvement_goal}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  improvement_goal: event.target.value as OnboardingResponse['improvement_goal'],
                }))
              }
              className="rounded-cv border border-cv-court/20 bg-cv-navy/40 px-4 py-3 text-cv-chalk"
            >
              <option value="player">Player IQ</option>
              <option value="coach">Coach IQ</option>
              <option value="gm">GM IQ</option>
            </select>
          </label>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (!isValidOnboardingResponse(form)) return;
                recommendationsMutation.mutate(form);
              }}
              className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
            >
              {recommendationsMutation.isPending ? 'Building...' : 'Build My Starter Plan'}
            </button>
            <button
              type="button"
              onClick={() => {
                skipOnboarding();
                navigate('/');
              }}
              className="rounded-cv border border-cv-court/20 px-4 py-2 text-sm font-semibold text-cv-chalk"
            >
              Skip For Now
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((recommendation) => (
            <Link
              key={`${recommendation.kind}-${recommendation.id}`}
              to={recommendation.route}
              className="block rounded-cv border border-cv-court/20 bg-cv-steel p-5 hover:border-cv-accent/60"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-cv-accent mb-2">
                {recommendation.kind} • {recommendation.role_lens}
              </p>
              <h2 className="text-2xl font-semibold text-cv-chalk mb-2">{recommendation.title}</h2>
              <p className="text-sm leading-6 text-cv-chalk/70">{recommendation.description}</p>
            </Link>
          ))}

          <Link to="/" className="inline-flex rounded-cv border border-cv-court/20 px-4 py-2 text-sm font-semibold text-cv-chalk">
            Continue to Court Vision
          </Link>
        </div>
      )}
    </div>
  );
}
