// shared/src/config/featureFlags.ts

/**
 * Feature flags for the Court Vision application.
 * These values are read in both the browser and the Node server, so the helper
 * avoids assuming a single runtime.
 */

const getEnvVar = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
    return process.env[key];
  }
  return undefined;
};

const isDev = (): boolean => {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
    return process.env.NODE_ENV !== 'production';
  }
  return true;
};

const readBooleanFlag = (key: string, defaultValue: boolean): boolean => {
  const envValue = getEnvVar(key);

  if (envValue === 'true') return true;
  if (envValue === 'false') return false;

  return defaultValue;
};

const defaultOn = isDev();

export const featureFlags = {
  lessonRuntimeEnabled: readBooleanFlag('VITE_ENABLE_LESSON_RUNTIME', defaultOn),
  filmBreakdownEnabled: readBooleanFlag('VITE_ENABLE_FILM_BREAKDOWN', defaultOn),
  scenarioLessonEnabled: readBooleanFlag('VITE_ENABLE_SCENARIO_LESSON', defaultOn),
  learnMoreEnabled: readBooleanFlag('VITE_ENABLE_LEARN_MORE', defaultOn),
  cmsLessonAuthoringEnabled: readBooleanFlag('VITE_ENABLE_CMS_LESSONS', defaultOn),
  cmsDailySchedulingEnabled: readBooleanFlag('VITE_ENABLE_CMS_DAILY', defaultOn),
  cmsTagManagementEnabled: readBooleanFlag('VITE_ENABLE_CMS_TAGS', defaultOn),
  progressPersistenceEnabled: readBooleanFlag('VITE_ENABLE_PROGRESS_PERSISTENCE', defaultOn),
  onboardingEnabled: readBooleanFlag('VITE_ENABLE_ONBOARDING', defaultOn),
  contentLibraryEnabled: readBooleanFlag('VITE_ENABLE_CONTENT_LIBRARY', defaultOn),
  discussionEnabled: readBooleanFlag('VITE_ENABLE_DISCUSSION', defaultOn),
  recapContentEnabled: readBooleanFlag('VITE_ENABLE_RECAPS', defaultOn),
  dailyChallengeEnabled: readBooleanFlag('VITE_ENABLE_DAILY_CHALLENGE', defaultOn),
  dailyShareEnabled: readBooleanFlag('VITE_ENABLE_DAILY_SHARE', defaultOn),
  dailyLeaderboardEnabled: readBooleanFlag('VITE_ENABLE_DAILY_LEADERBOARD', defaultOn),
  draftTeachingLayerEnabled: readBooleanFlag('VITE_ENABLE_DRAFT_TEACHING', defaultOn),
  draftCapstoneEnabled: readBooleanFlag('VITE_ENABLE_DRAFT_CAPSTONE', defaultOn),
  profileDashboardEnabled: readBooleanFlag('VITE_ENABLE_PROFILE_DASHBOARD', defaultOn),
  accountUpgradeEnabled: readBooleanFlag('VITE_ENABLE_ACCOUNT_UPGRADE', defaultOn),
  lessonLibraryPublicEnabled: readBooleanFlag('VITE_ENABLE_PUBLIC_LIBRARY', defaultOn),
  offseasonFoundationEnabled: readBooleanFlag('VITE_ENABLE_OFFSEASON_FOUNDATION', defaultOn),
  offseasonTeamContextEnabled: readBooleanFlag('VITE_ENABLE_OFFSEASON_TEAM_CONTEXT', defaultOn),
  offseasonCoachingMarketEnabled: readBooleanFlag('VITE_ENABLE_OFFSEASON_COACHING_MARKET', defaultOn),
  offseasonScoutingEnabled: readBooleanFlag('VITE_ENABLE_OFFSEASON_SCOUTING', defaultOn),
  offseasonTradeMarketEnabled: readBooleanFlag('VITE_ENABLE_OFFSEASON_TRADE_MARKET', defaultOn),
  offseasonDraftNightEnabled: readBooleanFlag('VITE_ENABLE_OFFSEASON_DRAFT_NIGHT', defaultOn),
  offseasonFreeAgencyEnabled: readBooleanFlag('VITE_ENABLE_OFFSEASON_FREE_AGENCY', defaultOn),
  offseasonDecisionLoopEnabled: readBooleanFlag('VITE_ENABLE_OFFSEASON_DECISION_LOOP', defaultOn),
};

export type FeatureFlags = typeof featureFlags;
