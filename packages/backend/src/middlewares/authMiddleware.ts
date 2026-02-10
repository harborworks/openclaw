import { NextFunction, Request, Response } from "express";
import config from "../config";

/**
 * Auth middleware supporting two modes:
 * 1. API key via X-API-Key header (for agents)
 * 2. Session cookie (for browser UI)
 *
 * Unauthenticated requests to /api/* get 401.
 * Auth endpoints (/api/auth/*) are exempt.
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip auth for non-API routes and auth endpoints
  if (!req.path.startsWith("/api/") || req.path.startsWith("/api/auth/")) {
    return next();
  }

  // Check API key
  const apiKey = req.headers["x-api-key"] as string;
  if (apiKey && apiKey === config.apiKey) {
    return next();
  }

  // Check session cookie
  const sessionToken = req.cookies?.session;
  if (sessionToken && sessionToken === config.sessionSecret) {
    return next();
  }

  res.status(401).json({ message: "Unauthorized" });
};

/**
 * Placeholder for admin check — currently all authenticated users are admins.
 * Replace with role-based checks when real auth is added.
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  next();
};
