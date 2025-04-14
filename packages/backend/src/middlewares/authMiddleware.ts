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

/**
 * Middleware to ensure that a request is made by an admin user
 * (either a superadmin or an organization admin for the specified organization)
 * Returns 401 if no user is authenticated, 403 if the user is not an admin
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // First check if user is authenticated
  if (!req.user) {
    res.status(401).json({
      message: "Unauthorized. Authentication required.",
    });
    return;
  }

  // If user is a superadmin, allow access immediately
  if (req.user.superadmin) {
    return next();
  }

  // Extract orgId from request params to check for org admin status
  const orgId = parseInt(req.params.orgId);

  if (isNaN(orgId)) {
    res.status(400).json({
      message: "Invalid organization ID",
    });
    return;
  }

  try {
    // Check if user is an admin in this organization
    const userMemberships = await db.getUserOrgs(req.user.id);
    const isOrgAdmin = userMemberships.some(
      (membership) => membership.id === orgId && membership.isAdmin
    );

    if (!isOrgAdmin) {
      res.status(403).json({
        message: "Forbidden. Admin privileges required.",
      });
      return;
    }

    // User is authenticated and is an admin for this organization
    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({
      message: "Internal server error when checking admin status",
    });
  }
};
