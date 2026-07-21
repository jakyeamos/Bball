import { OnboardingResponse } from '@nba-draft-sim/shared';

const STORAGE_KEY = 'court-vision.onboarding';

interface StoredOnboardingState {
  skipped?: boolean;
  completed?: boolean;
  response?: OnboardingResponse;
}

export function readOnboardingState(): StoredOnboardingState {
  if (typeof window === 'undefined') return {};

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as StoredOnboardingState;
  } catch {
    return {};
  }
}

function writeOnboardingState(nextState: StoredOnboardingState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

export function skipOnboarding(): void {
  writeOnboardingState({ skipped: true });
}

export function completeOnboarding(response: OnboardingResponse): void {
  writeOnboardingState({ completed: true, response });
}
