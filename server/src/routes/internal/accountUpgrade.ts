/**
 * server/src/routes/internal/accountUpgrade.ts
 * Phase 02-02: Anonymous-to-email account upgrade endpoint.
 *
 * POST /internal/account-upgrade
 *
 * Upgrades an anonymous Supabase session to a permanent email/password account
 * while preserving all user-owned data (lesson_progress, daily_challenge_attempts,
 * offseason_runs).
 *
 * How Supabase anonymous-to-email upgrade works:
 *   - Supabase provides `auth.updateUser({ email, password })` which converts an
 *     anonymous user to an email user without changing the user.id.
 *   - Because user.id stays the same, all RLS-protected rows (user_id FK) remain
 *     associated to the same owner automatically — no row migration needed.
 *   - We verify this by counting rows before and after the upgrade and returning
 *     a migration report in the response.
 *
 * Security notes:
 *   - anonymous_user_id in the request body MUST match the JWT sub claim.
 *     This prevents one user from upgrading another user's account.
 *   - The endpoint requires a valid Supabase user JWT in Authorization header.
 *   - Passwords are never stored or logged by this server — only passed through
 *     to the Supabase auth API over HTTPS.
 *
 * Response shape:
 *   {
 *     "success": boolean,
 *     "upgrade": {
 *       "pre_upgrade_user_id":  string,
 *       "post_upgrade_user_id": string,
 *       "ids_match":            boolean,
 *       "migrated_rows": {
 *         "lesson_progress":            number,
 *         "daily_challenge_attempts":   number,
 *         "offseason_runs":             number
 *       }
 *     }
 *   }
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY         — used to create per-user clients
 *   SUPABASE_SERVICE_ROLE_KEY — used by admin client for row counting
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { validateAccountUpgradePayload } from '@nba-draft-sim/shared';

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a user-scoped Supabase client authenticated with the provided JWT.
 * Used to call auth.updateUser() in the context of the anonymous user's session.
 */
function createUserClient(token: string) {
  const url = process.env.SUPABASE_URL!;
  const anonKey = process.env.SUPABASE_ANON_KEY!;

  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Counts rows owned by the given user in all user-scoped tables.
 * Uses the admin (service-role) client to bypass RLS so counts are accurate
 * regardless of session state during the upgrade transition.
 */
async function countOwnedRows(userId: string): Promise<{
  lesson_progress: number;
  daily_challenge_attempts: number;
  offseason_runs: number;
}> {
  const admin = getSupabaseAdmin();

  const [lessonsResult, dailyResult, runsResult] = await Promise.all([
    admin
      .from('lesson_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    admin
      .from('daily_challenge_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    admin
      .from('offseason_runs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  return {
    lesson_progress: lessonsResult.count ?? 0,
    daily_challenge_attempts: dailyResult.count ?? 0,
    offseason_runs: runsResult.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * POST /internal/account-upgrade
 *
 * Headers:
 *   Authorization: Bearer <supabase-anon-user-jwt>
 *
 * Body (JSON):
 *   {
 *     "anonymous_user_id": "<uuid>",
 *     "email": "user@example.com",
 *     "password": "min8chars"
 *   }
 */
router.post('/account-upgrade', async (req: Request, res: Response) => {
  // 1. Validate request body
  const validation = validateAccountUpgradePayload(req.body);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      errors: validation.errors,
    });
  }

  const { anonymous_user_id, email, password } = validation.data;

  // 2. Extract caller's JWT from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      errors: ['Authorization header with Bearer token is required.'],
    });
  }

  const token = authHeader.slice(7);

  // 3. Verify the JWT belongs to the claimed anonymous_user_id
  //    Use the admin client to look up the caller's identity.
  const admin = getSupabaseAdmin();
  const { data: callerData, error: callerErr } = await admin.auth.getUser(token);

  if (callerErr || !callerData.user) {
    return res.status(401).json({
      success: false,
      errors: ['Could not verify caller identity: ' + (callerErr?.message ?? 'unknown error')],
    });
  }

  if (callerData.user.id !== anonymous_user_id) {
    return res.status(403).json({
      success: false,
      errors: ['anonymous_user_id does not match the provided session token.'],
    });
  }

  const preUpgradeUserId = callerData.user.id;

  // 4. Count owned rows before upgrade (for audit report)
  const preRows = await countOwnedRows(preUpgradeUserId);

  // 5. Perform the upgrade: updateUser() converts anon session to email/password.
  //    The user.id is preserved by Supabase — this is the key property that keeps
  //    all RLS-protected rows attached to the same owner without any migration.
  const userClient = createUserClient(token);
  const { data: upgradeData, error: upgradeErr } = await userClient.auth.updateUser({
    email,
    password,
  });

  if (upgradeErr || !upgradeData.user) {
    return res.status(500).json({
      success: false,
      errors: ['Upgrade failed: ' + (upgradeErr?.message ?? 'unknown error')],
    });
  }

  const postUpgradeUserId = upgradeData.user.id;

  // 6. Update the public.users profile row to reflect new email and non-anon status.
  //    This does not affect RLS — it's a metadata sync for application-level reads.
  await admin
    .from('users')
    .update({
      email,
      is_anonymous: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', preUpgradeUserId);

  // 7. Count rows after upgrade to confirm zero data loss
  const postRows = await countOwnedRows(postUpgradeUserId);

  const idsMatch = preUpgradeUserId === postUpgradeUserId;

  // 8. Return audit report
  return res.status(200).json({
    success: true,
    upgrade: {
      pre_upgrade_user_id: preUpgradeUserId,
      post_upgrade_user_id: postUpgradeUserId,
      ids_match: idsMatch,
      migrated_rows: {
        lesson_progress: postRows.lesson_progress,
        daily_challenge_attempts: postRows.daily_challenge_attempts,
        offseason_runs: postRows.offseason_runs,
      },
      pre_upgrade_row_counts: {
        lesson_progress: preRows.lesson_progress,
        daily_challenge_attempts: preRows.daily_challenge_attempts,
        offseason_runs: preRows.offseason_runs,
      },
    },
  });
});

export default router;
