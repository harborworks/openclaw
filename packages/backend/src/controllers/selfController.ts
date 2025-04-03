import { NextFunction, Request, Response } from "express";
import * as db from "../db";

/**
 * Get the current authenticated user and their memberships
 * Requires authentication
 */
export const getSelf = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        message: "Unauthorized. Authentication required.",
      });
      return;
    }

    // Get user's organization memberships
    const memberships = await db.getUserOrgs(req.user.id);

    // Return user information along with their memberships
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          superadmin: req.user.superadmin,
          createdAt: req.user.createdAt,
          updatedAt: req.user.updatedAt,
        },
        memberships: memberships,
      },
    });
  } catch (error) {
    next(error);
  }
};
