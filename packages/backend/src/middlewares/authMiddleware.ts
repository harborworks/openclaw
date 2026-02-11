import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";

import config from "../config.js";
import { upsertUser, getUserMemberships } from "../db/users.js";

// ── Types ──────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        auth0Id: string; // kept as-is for compat, stores cognito sub
        email: string;
        name?: string;
        isSuperadmin: boolean;
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

// ── JWKS client (Cognito) ──────────────────────────────────────

let jwksClient: JwksClient | null = null;

function getJwksClient(): JwksClient {
  if (!jwksClient) {
    const { cognitoRegion, cognitoUserPoolId } = config;
    jwksClient = new JwksClient({
      jwksUri: `https://cognito-idp.${cognitoRegion}.amazonaws.com/${cognitoUserPoolId}/.well-known/jwks.json`,
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

async function verifyCognitoToken(
  token: string
): Promise<{ sub: string; email?: string; name?: string }> {
  const { cognitoRegion, cognitoUserPoolId, cognitoClientId } = config;
  const issuer = `https://cognito-idp.${cognitoRegion}.amazonaws.com/${cognitoUserPoolId}`;

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      (header, callback) => {
        getSigningKey(header).then(
          (key) => callback(null, key),
          (err) => callback(err)
        );
      },
      {
        issuer,
        algorithms: ["RS256"],
      },
      (err, decoded) => {
        if (err) return reject(err);
        const payload = decoded as jwt.JwtPayload;

        // Cognito ID tokens have token_use=id, access tokens have token_use=access
        // We accept both but prefer ID tokens for user info
        if (payload.token_use && payload.token_use !== "id" && payload.token_use !== "access") {
          return reject(new Error("Invalid token_use"));
        }

        // Verify client ID for ID tokens
        if (payload.token_use === "id" && cognitoClientId && payload.aud !== cognitoClientId) {
          return reject(new Error("Token audience mismatch"));
        }

        resolve({
          sub: payload.sub!,
          email: payload.email,
          name: payload.name || payload["cognito:username"],
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

  // 2. Cognito JWT (Authorization: Bearer <token>) — browser auth
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    if (!config.cognitoUserPoolId) {
      res.status(500).json({ message: "Cognito not configured" });
      return;
    }

    try {
      const cognitoUser = await verifyCognitoToken(token);

      // Upsert user in DB (auth0Id column stores cognito sub)
      const user = await upsertUser(
        cognitoUser.sub,
        cognitoUser.email || "",
        cognitoUser.name
      );

      const memberships = await getUserMemberships(user.id);

      req.user = {
        id: user.id,
        auth0Id: cognitoUser.sub,
        email: user.email,
        name: user.name || undefined,
        isSuperadmin: user.isSuperadmin,
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

/**
 * Require the user to be a global superadmin.
 */
export const requireSuperadmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.isSuperadmin) {
    res.status(403).json({ message: "Forbidden: superadmin only" });
    return;
  }
  next();
};
