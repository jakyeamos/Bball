import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const isAdminRequest =
    req.header('x-cv-admin') === 'true' ||
    req.query.admin === 'true';

  if (!isAdminRequest) {
    res.status(403).json({
      error: 'Admin access required.',
      issues: [{ path: 'admin', message: 'This route is limited to admin users.' }],
    });
    return;
  }

  next();
}
