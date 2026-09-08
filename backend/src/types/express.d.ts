/**
 * Augment the Express Request interface to include the authenticated user
 * payload set by the auth middleware after JWT verification.
 */

export interface AuthUser {
  id: number;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
