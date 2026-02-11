import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";

import config from "../config";

// ── Types ──────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      /** Set when authenticated via Auth0 JWT */
      auth?: { sub: string; email?: string };
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
): Promise<{ sub: string; email?: string }> {
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
        audience: config.auth0Audience,
        issuer: `https://${config.auth0Domain}/`,
        algorithms: ["RS256"],
      },
      (err, decoded) => {
        if (err) return reject(err);
        const payload = decoded as jwt.JwtPayload;
        resolve({ sub: payload.sub!, email: payload.email });
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
      req.auth = await verifyAuth0Token(token);
      return next();
    } catch {
      res.status(401).json({ message: "Invalid token" });
      return;
    }
  }

  res.status(401).json({ message: "Unauthorized" });
};
