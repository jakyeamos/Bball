/**
 * Session Manager
 * Handles lightweight session-based user identity (no accounts)
 * Users identified by cookies/localStorage
 */

import { UserSession } from '@nba-draft-sim/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory session store
 * In production, this would use Redis or similar
 */
class SessionStore {
  private sessions: Map<string, UserSession> = new Map();

  create(displayName: string): UserSession {
    const session: UserSession = {
      userId: uuidv4(),
      displayName,
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(session.userId, session);
    return session;
  }

  get(userId: string): UserSession | undefined {
    return this.sessions.get(userId);
  }

  update(userId: string, updates: Partial<UserSession>): UserSession | undefined {
    const session = this.sessions.get(userId);
    if (!session) return undefined;

    const updated = { ...session, ...updates };
    this.sessions.set(userId, updated);
    return updated;
  }

  delete(userId: string): boolean {
    return this.sessions.delete(userId);
  }

  exists(userId: string): boolean {
    return this.sessions.has(userId);
  }

  getAll(): UserSession[] {
    return Array.from(this.sessions.values());
  }

  clear(): void {
    this.sessions.clear();
  }

  // Cleanup old sessions (older than 24 hours)
  cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let deleted = 0;

    for (const [userId, session] of this.sessions.entries()) {
      const sessionAge = now - new Date(session.createdAt).getTime();
      if (sessionAge > maxAgeMs) {
        this.sessions.delete(userId);
        deleted++;
      }
    }

    return deleted;
  }
}

// Singleton instance
export const sessionStore = new SessionStore();

/**
 * Create or retrieve session
 */
export function getOrCreateSession(userId: string | null, displayName?: string): UserSession {
  // Try to retrieve existing session
  if (userId) {
    const existing = sessionStore.get(userId);
    if (existing) {
      return existing;
    }
  }

  // Create new session
  if (!displayName) {
    displayName = `Player ${Math.floor(Math.random() * 9999)}`;
  }

  return sessionStore.create(displayName);
}

/**
 * Validate session exists
 */
export function validateSession(userId: string): boolean {
  return sessionStore.exists(userId);
}

/**
 * Update session display name
 */
export function updateSessionName(userId: string, displayName: string): UserSession | undefined {
  return sessionStore.update(userId, { displayName });
}

/**
 * Delete session
 */
export function deleteSession(userId: string): boolean {
  return sessionStore.delete(userId);
}

/**
 * Get all active sessions (for debugging)
 */
export function getAllSessions(): UserSession[] {
  return sessionStore.getAll();
}

/**
 * Cleanup old sessions (run periodically)
 */
export function cleanupOldSessions(maxAgeMs?: number): number {
  return sessionStore.cleanup(maxAgeMs);
}

/**
 * Session cookie/header name
 */
export const SESSION_COOKIE_NAME = 'nba_draft_sim_session';

/**
 * Session cookie options
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};
