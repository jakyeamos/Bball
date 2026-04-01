const GUEST_USER_ID_KEY = 'court-vision.guest-user-id';

function createGuestUserId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `guest-${crypto.randomUUID()}`;
  }

  return `guest-${Math.random().toString(36).slice(2, 10)}`;
}

export function getGuestUserId(): string {
  if (typeof window === 'undefined') {
    return 'guest-server';
  }

  const existing = window.localStorage.getItem(GUEST_USER_ID_KEY);
  if (existing) {
    return existing;
  }

  const nextId = createGuestUserId();
  window.localStorage.setItem(GUEST_USER_ID_KEY, nextId);
  return nextId;
}

export function clearGuestUserId(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(GUEST_USER_ID_KEY);
}
