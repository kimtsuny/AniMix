import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthUser } from "../types/express.js";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.cookies.token as string | undefined;

  if (!token) {
    res.status(401).json({
      message: "Unauthorized",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Validate the decoded payload has the expected shape
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      "id" in decoded &&
      "email" in decoded
    ) {
      req.user = decoded as AuthUser;
      next();
    } else {
      res.status(401).json({
        message: "Invalid token",
      });
    }
  } catch {
    res.status(401).json({
      message: "Invalid token",
    });
  }
}

export function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const token = req.cookies.token as string | undefined;

  if (!token) {
    req.user = undefined;
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (
      typeof decoded === "object" &&
      decoded !== null &&
      "id" in decoded &&
      "email" in decoded
    ) {
      req.user = decoded as AuthUser;
    } else {
      req.user = undefined;
    }
  } catch {
    req.user = undefined;
  }

  next();
}
