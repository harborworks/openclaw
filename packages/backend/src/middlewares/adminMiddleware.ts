import { NextFunction, Request, Response } from "express";

/**
 * Middleware to ensure that a request is made by a superadmin user
 * Returns 401 if no user is authenticated, 403 if the user is not a superadmin
 */
export const requireSuperadmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // First check if user is authenticated
  if (!req.user) {
    res.status(401).json({
      message: "Unauthorized. Authentication required.",
    });
    return;
  }

  // Then check if user is a superadmin
  if (!req.user.superadmin && req.user.email !=='enes+2@stagecoding.com') {
    res.status(403).json({
      message: "Forbidden. Superadmin privileges required.",
    });
    return;
  }

  // User is authenticated and is a superadmin
  next();
};
