import { users } from "@sparrow-tags/schema";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { NextFunction, Request, Response } from "express";

import config from "../config";
import * as db from "../db";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: typeof users.$inferSelect;
    }
  }
}

const verifier = CognitoJwtVerifier.create({
  userPoolId: config.userPoolId,
  clientId: config.clientId,
  tokenUse: "access",
});

/**
 * Authentication middleware that verifies Cognito JWT tokens
 * If a valid token is found, the user is attached to the request object
 * If the token is invalid or missing, the request continues with user as undefined
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token, continue without user
      return next();
    }

    const token = authHeader.split(" ")[1];
    try {
      const result = await verifier.verify(token);
      const user = await db.getUserByCognitoId(result.sub);
      req.user = user;
    } catch (error) {
      console.error("Auth middleware error:", error);
      return next();
    }
    next();
  } catch (error) {
    // On any error, continue without user
    console.error("Auth middleware error:", error);
    next();
  }
};
