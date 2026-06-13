import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createInitialOffseasonRunState } from '@nba-draft-sim/shared';

dotenv.config();

type UserScopedTable = 'lesson_progress' | 'daily_challenge_attempts' | 'offseason_runs';

interface SmokeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  serverUrl: string;
  keepUser: boolean;
}

interface SeedMarkers {
  lessonId: string;
  challengeDate: string;
  challengeId: string;
  runId: string;
}

interface UpgradeResponse {
  success: boolean;
  errors?: string[];
  upgrade?: {
    pre_upgrade_user_id: string;
    post_upgrade_user_id: string;
    ids_match: boolean;
    migrated_rows: Record<UserScopedTable, number>;
    pre_upgrade_row_counts: Record<UserScopedTable, number>;
  };
}

interface RlsProbeResponse {
  ok: boolean;
  scenarios: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }>;
  summary: {
    passed: number;
    failed: number;
    total: number;
  };
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function loadConfig(): SmokeConfig {
  return {
    supabaseUrl: requiredEnv('SUPABASE_URL'),
    supabaseAnonKey: requiredEnv('SUPABASE_ANON_KEY'),
    supabaseServiceRoleKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    serverUrl: process.env.CV_SMOKE_SERVER_URL ?? 'http://localhost:3001',
    keepUser: process.env.CV_SUPABASE_SMOKE_KEEP_USER === '1',
  };
}

function createAnonymousClient(config: SmokeConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createBearerClient(config: SmokeConfig, accessToken: string): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createAdminClient(config: SmokeConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function buildMarkers(): SeedMarkers {
  const stamp = Date.now();
  return {
    lessonId: `phase-8-smoke-lesson-${stamp}`,
    challengeDate: '2099-12-31',
    challengeId: `phase-8-smoke-daily-${stamp}`,
    runId: `phase-8-smoke-run-${stamp}`,
  };
}

async function seedSupabaseRows(
  admin: SupabaseClient,
  userId: string,
  email: string,
  markers: SeedMarkers
): Promise<void> {
  const now = new Date().toISOString();
  const runState = createInitialOffseasonRunState({
    run_id: markers.runId,
    season_year: 2026,
    now_iso: now,
  });

  const profile = await admin.from('users').upsert({
    id: userId,
    email: null,
    display_name: 'Phase 8 Smoke Anonymous',
    is_anonymous: true,
  });
  assert(!profile.error, `Failed to seed users row: ${profile.error?.message ?? 'unknown error'}`);

  const lesson = await admin.from('lesson_progress').insert({
    user_id: userId,
    lesson_id: markers.lessonId,
    completed: true,
    accuracy_pct: 88,
    attempts: 1,
    last_attempted_at: now,
  });
  assert(!lesson.error, `Failed to seed lesson_progress row: ${lesson.error?.message ?? 'unknown error'}`);

  const daily = await admin.from('daily_challenge_attempts').insert({
    user_id: userId,
    challenge_date: markers.challengeDate,
    challenge_id: markers.challengeId,
    score: 100,
    max_score: 100,
    submitted: true,
    streak_day: 3,
  });
  assert(
    !daily.error,
    `Failed to seed daily_challenge_attempts row: ${daily.error?.message ?? 'unknown error'}`
  );

  const run = await admin.from('offseason_runs').insert({
    user_id: userId,
    run_id: markers.runId,
    team_id: '1610612738',
    season: '2025-26',
    phase: 'team_context',
    state_json: runState,
    completed: false,
  });
  assert(!run.error, `Failed to seed offseason_runs row: ${run.error?.message ?? 'unknown error'}`);

  console.log(`Seeded Supabase proof rows for anonymous user ${userId} (${email}).`);
}

async function runRlsProbe(config: SmokeConfig, userId: string, accessToken: string): Promise<void> {
  const url = new URL('/internal/rls-probe', config.serverUrl);
  url.searchParams.set('token', accessToken);
  url.searchParams.set('userId', userId);

  const response = await fetch(url);
  const body = (await response.json()) as RlsProbeResponse;

  assert(response.ok && body.ok, `RLS probe failed: ${JSON.stringify(body, null, 2)}`);
  console.log(
    `RLS probe passed (${body.summary.passed}/${body.summary.total}): ` +
      body.scenarios.map((scenario) => scenario.name).join(', ')
  );
}

async function callAccountUpgrade(
  config: SmokeConfig,
  userId: string,
  accessToken: string,
  email: string,
  password: string
): Promise<UpgradeResponse> {
  const response = await fetch(new URL('/internal/account-upgrade', config.serverUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      anonymous_user_id: userId,
      email,
      password,
    }),
  });

  const body = (await response.json()) as UpgradeResponse;
  assert(response.ok && body.success, `Account upgrade failed: ${JSON.stringify(body, null, 2)}`);
  return body;
}

async function countVisibleRows(
  client: SupabaseClient,
  table: UserScopedTable,
  column: string,
  value: string
): Promise<number> {
  const result = await client.from(table).select('id').eq(column, value);
  assert(!result.error, `Failed to read ${table} through user session: ${result.error?.message ?? 'unknown error'}`);
  return result.data?.length ?? 0;
}

async function assertSecondDeviceSync(
  config: SmokeConfig,
  email: string,
  password: string,
  originalUserId: string,
  markers: SeedMarkers
): Promise<void> {
  const secondDevice = createAnonymousClient(config);
  const login = await secondDevice.auth.signInWithPassword({ email, password });

  assert(!login.error, `Second-device sign-in failed: ${login.error?.message ?? 'unknown error'}`);
  assert(login.data.user?.id === originalUserId, 'Second-device sign-in returned a different Supabase user id.');
  assert(login.data.session?.access_token != null, 'Second-device sign-in did not return an access token.');

  const secondDeviceToken = login.data.session.access_token;
  const syncedClient = createBearerClient(config, secondDeviceToken);
  const lessonCount = await countVisibleRows(syncedClient, 'lesson_progress', 'lesson_id', markers.lessonId);
  const dailyCount = await countVisibleRows(
    syncedClient,
    'daily_challenge_attempts',
    'challenge_id',
    markers.challengeId
  );
  const runCount = await countVisibleRows(syncedClient, 'offseason_runs', 'run_id', markers.runId);

  assert(lessonCount === 1, `Expected second device to see 1 lesson_progress row, saw ${lessonCount}.`);
  assert(dailyCount === 1, `Expected second device to see 1 daily_challenge_attempts row, saw ${dailyCount}.`);
  assert(runCount === 1, `Expected second device to see 1 offseason_runs row, saw ${runCount}.`);

  console.log('Second-device sync passed for lesson progress, daily challenge history, and offseason run state.');
}

async function cleanupUser(admin: SupabaseClient, userId: string): Promise<void> {
  const deletion = await admin.auth.admin.deleteUser(userId);
  assert(!deletion.error, `Cleanup failed for auth user ${userId}: ${deletion.error?.message ?? 'unknown error'}`);
  console.log(`Cleaned up smoke auth user ${userId}.`);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const admin = createAdminClient(config);
  const firstDevice = createAnonymousClient(config);
  const markers = buildMarkers();
  const email = `phase-8-smoke-${Date.now()}@example.com`;
  const password = `Phase8Smoke-${Date.now()}`;
  let createdUserId: string | null = null;

  const anonymousSignIn = await firstDevice.auth.signInAnonymously();
  assert(!anonymousSignIn.error, `Anonymous sign-in failed: ${anonymousSignIn.error?.message ?? 'unknown error'}`);
  assert(anonymousSignIn.data.user?.id != null, 'Anonymous sign-in did not return a user id.');
  assert(anonymousSignIn.data.session?.access_token != null, 'Anonymous sign-in did not return an access token.');

  const anonymousUser = anonymousSignIn.data.user;
  const anonymousSession = anonymousSignIn.data.session;
  createdUserId = anonymousUser.id;
  const anonymousToken = anonymousSession.access_token;
  console.log(`Anonymous sign-in passed with user id ${createdUserId}.`);

  try {
    await seedSupabaseRows(admin, createdUserId, email, markers);
    await runRlsProbe(config, createdUserId, anonymousToken);

    const upgrade = await callAccountUpgrade(config, createdUserId, anonymousToken, email, password);
    assert(upgrade.upgrade != null, 'Account upgrade response did not include an upgrade report.');
    const report = upgrade.upgrade;
    assert(report.ids_match === true, 'Account upgrade did not preserve the original user id.');
    assert(report.pre_upgrade_row_counts.lesson_progress >= 1, 'Missing pre-upgrade lesson_progress rows.');
    assert(report.migrated_rows.lesson_progress >= 1, 'Missing post-upgrade lesson_progress rows.');
    assert(
      report.migrated_rows.daily_challenge_attempts >= 1,
      'Missing post-upgrade daily_challenge_attempts rows.'
    );
    assert(report.migrated_rows.offseason_runs >= 1, 'Missing post-upgrade offseason_runs rows.');
    console.log('Account upgrade continuity passed with preserved Supabase user id and row counts.');

    await assertSecondDeviceSync(config, email, password, createdUserId, markers);

    if (config.keepUser) {
      console.log(`Keeping smoke user ${createdUserId} for inspection because CV_SUPABASE_SMOKE_KEEP_USER=1.`);
    } else {
      await cleanupUser(admin, createdUserId);
      createdUserId = null;
    }

    console.log('PASS Phase 8 Supabase smoke: anonymous upgrade continuity and second-device sync verified.');
  } catch (error) {
    if (createdUserId) {
      console.error(`Smoke test failed; leaving auth user ${createdUserId} in Supabase for inspection.`);
    }
    throw error;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL Phase 8 Supabase smoke: ${message}`);
  process.exitCode = 1;
});
