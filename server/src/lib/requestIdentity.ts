import { Request } from 'express';

export function getRequestUserId(req: Request): string {
  const headerUserId = req.header('x-user-id');
  if (headerUserId && headerUserId.trim()) {
    return headerUserId.trim();
  }

  if (typeof req.query.user_id === 'string' && req.query.user_id.trim()) {
    return req.query.user_id.trim();
  }

  if (typeof req.body?.user_id === 'string' && req.body.user_id.trim()) {
    return req.body.user_id.trim();
  }

  return 'guest-anonymous';
}

export function getDisplayNameFromUserId(userId: string): string {
  if (userId.startsWith('guest-')) {
    return 'Guest Scout';
  }

  return `User ${userId.slice(0, 6)}`;
}
