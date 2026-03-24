/**
 * server/src/middleware/validateBody.ts
 * Phase 02-03: Reusable request-body validation middleware for Court Vision API routes.
 *
 * Usage:
 *   import { validateBody } from '../middleware/validateBody';
 *   import { progressWriteSchema } from '@nba-draft-sim/shared';
 *
 *   router.post('/progress', validateBody(progressWriteSchema), handler);
 *
 * On validation failure the middleware terminates the request with:
 *   HTTP 400
 *   { "error": "Validation failed", "issues": [ { "path": "field", "message": "..." } ] }
 *
 * On success, `res.locals.validatedBody` holds the parsed, type-safe payload.
 * The route handler should read it from there:
 *   const payload = res.locals.validatedBody as ProgressWritePayload;
 *
 * The `issues` array uses a "path" key so callers can map errors to form fields
 * without parsing free-form strings.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Schema } from '@nba-draft-sim/shared';

/**
 * Builds an Express middleware that validates `req.body` against the provided
 * schema. The schema must expose a `safeParse(body)` method that returns a
 * `ValidationResult<T>` (see shared/schemas.ts).
 */
export function validateBody<T>(schema: Schema<T>): RequestHandler {
  return function validateBodyMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const result = schema.safeParse(req.body);

    if (!result.valid) {
      // Map flat error strings to structured { path, message } objects.
      // We extract the field name from the leading word before " is " or " must ".
      const issues = result.errors.map((msg) => {
        const fieldMatch = msg.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s/);
        return {
          path: fieldMatch ? fieldMatch[1] : 'body',
          message: msg,
        };
      });

      res.status(400).json({
        error: 'Validation failed',
        issues,
      });
      return;
    }

    // Attach the parsed payload so route handlers can read it type-safely.
    res.locals.validatedBody = result.data;
    next();
  };
}
