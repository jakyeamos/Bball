/**
 * shared/schemas.ts
 * Phase 02-02: Validated payload schemas for Court Vision API routes.
 *
 * Uses manual type-guard validation rather than a runtime library (zod/yup) to
 * keep the shared package dependency-free. Server-side route handlers call these
 * validators and return 400 errors on failure before any database work begins.
 *
 * Schemas exported here:
 *   AccountUpgradePayload  — body for POST /internal/account-upgrade
 *   validateAccountUpgradePayload() — returns parsed payload or ValidationError
 */

// ---------------------------------------------------------------------------
// Shared error type
// ---------------------------------------------------------------------------

export interface ValidationError {
  valid: false;
  errors: string[];
}

export interface ValidationSuccess<T> {
  valid: true;
  data: T;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

// ---------------------------------------------------------------------------
// AccountUpgradePayload
// ---------------------------------------------------------------------------
//
// Sent by the client when an anonymous user wants to link their session to
// an email/password account.  The anonymous_user_id MUST match the caller's
// current Supabase anonymous session id — the server verifies this to prevent
// session hijacking.
//
// Fields:
//   anonymous_user_id  — Supabase user.id of the current anonymous session
//   email              — desired email for the new account (normalized to lowercase)
//   password           — must be >= 8 characters; server does NOT store this
// ---------------------------------------------------------------------------

export interface AccountUpgradePayload {
  anonymous_user_id: string;
  email: string;
  password: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates an account-upgrade request body.
 * Returns a typed success result or a list of field-level error messages.
 */
export function validateAccountUpgradePayload(
  body: unknown
): ValidationResult<AccountUpgradePayload> {
  const errors: string[] = [];

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { valid: false, errors: ['Request body must be a JSON object.'] };
  }

  const raw = body as Record<string, unknown>;

  // anonymous_user_id
  if (typeof raw.anonymous_user_id !== 'string' || raw.anonymous_user_id.trim() === '') {
    errors.push('anonymous_user_id is required and must be a non-empty string.');
  } else if (!UUID_REGEX.test(raw.anonymous_user_id)) {
    errors.push('anonymous_user_id must be a valid UUID.');
  }

  // email
  if (typeof raw.email !== 'string' || raw.email.trim() === '') {
    errors.push('email is required and must be a non-empty string.');
  } else if (!EMAIL_REGEX.test(raw.email.trim())) {
    errors.push('email must be a valid email address.');
  }

  // password
  if (typeof raw.password !== 'string' || raw.password.length === 0) {
    errors.push('password is required and must be a non-empty string.');
  } else if (raw.password.length < 8) {
    errors.push('password must be at least 8 characters.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      anonymous_user_id: (raw.anonymous_user_id as string).trim(),
      email: (raw.email as string).trim().toLowerCase(),
      password: raw.password as string,
    },
  };
}
