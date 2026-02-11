import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";

import config from "../config";
import { upsertUser, getUserMemberships } from "../db/users";

// ── Types ──────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      /** Set when authenticated via Auth0 JWT */
      user?: {
        id: number;
        auth0Id: string;
        email: string;
        name?: string;
        /** Org IDs this user belongs to */
        orgIds: number[];
        memberships: Array<{
          orgId: number;
          role: string;
          orgName: string;
          orgSlug: string;
        }>;
      };
    }
  }
}

// ── JWKS client (Auth0) ────────────────────────────────────────

let jwksClient: JwksClient | null = null;

function getJwksClient(): JwksClient {
  if (!jwksClient) {
    jwksClient = new JwksClient({
      jwksUri: `https://${config.auth0Domain}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
    });
  }
  return jwksClient;
}

function getSigningKey(header: jwt.JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    getJwksClient().getSigningKey(header.kid, (err, key) => {
      if (err) return reject(err);
      resolve(key!.getPublicKey());
    });
  });
}

async function verifyAuth0Token(
  token: string
): Promise<{ sub: string; email?: string; name?: string }> {
  const verifyOpts: jwt.VerifyOptions = {
    issuer: `https://${config.auth0Domain}/`,
    algorithms: ["RS256"],
  };
  // Only check audience if configured
  if (config.auth0Audience) {
    verifyOpts.audience = config.auth0Audience;
  }

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      (header, callback) => {
        getSigningKey(header).then(
          (key) => callback(null, key),
          (err) => callback(err)
        );
      },
      verifyOpts,
      (err, decoded) => {
        if (err) return reject(err);
        const payload = decoded as jwt.JwtPayload;
        resolve({
          sub: payload.sub!,
          email: payload.email || payload["https://harbor.dev/email"],
          name: payload.name || payload["https://harbor.dev/name"],
        });
      }
    );
  });
}

// ── Middleware ──────────────────────────────────────────────────

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip auth for non-API routes, auth config endpoint, and health
  if (
    !req.path.startsWith("/api/") ||
    req.path === "/api/auth/config" ||
    req.path === "/health"
  ) {
    return next();
  }

  // 1. API key (X-API-Key header) — daemon auth
  const apiKey = req.headers["x-api-key"] as string;
  if (apiKey) {
    if (apiKey === config.apiKey) {
      return next();
    }
    res.status(401).json({ message: "Invalid API key" });
    return;
  }

  // 2. Auth0 JWT (Authorization: Bearer <token>) — browser auth
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    if (!config.auth0Domain) {
      res.status(500).json({ message: "Auth0 not configured" });
      return;
    }

    try {
      const auth0User = await verifyAuth0Token(token);

      // Upsert user in DB
      const user = await upsertUser(
        auth0User.sub,
        auth0User.email || "",
        auth0User.name
      );

      // Load memberships
      const memberships = await getUserMemberships(user.id);

      req.user = {
        id: user.id,
        auth0Id: auth0User.sub,
        email: user.email,
        name: user.name || undefined,
        orgIds: memberships.map((m) => m.orgId),
        memberships,
      };

      return next();
    } catch {
      res.status(401).json({ message: "Invalid token" });
      return;
    }
  }

  res.status(401).json({ message: "Unauthorized" });
};

/**
 * Require the user to be a member of at least one org.
 * Use on routes that need org-scoped access.
 */
export const requireOrgMember = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.orgIds.length === 0) {
    res.status(403).json({
      message: "You don't have access to any organization. Contact an admin.",
    });
    return;
  }
  next();
};
