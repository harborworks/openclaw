import { NextFunction, Request, Response } from "express";
import * as db from "../db";
import * as cognitoService from "../services/cognitoService";

/**
 * Get all users
 * This endpoint is protected by the superadmin middleware
 */
export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await db.getAllUsers();

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { cognitoId, email } = req.body;

    if (!cognitoId || !email) {
      res.status(400).json({
        message: "Missing required fields: cognitoId and email are required",
      });
      return;
    }

    // Create the user
    const user = await db.createUser(cognitoId, email);

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Invite a new user to the application
 * This will create a user in Cognito and send an invitation email
 * The user will be created in our database when they complete the signup process
 */
export const inviteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        message: "Missing required field: email is required",
      });
      return;
    }

    // Check if email format is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        message: "Invalid email format",
      });
      return;
    }

    // Invite the user to Cognito
    const result = await cognitoService.inviteUser(email);

    res.status(201).json({
      success: true,
      message: "User invited successfully",
      cognitoUsername: result.User?.Username,
    });
  } catch (error: any) {
    // Handle specific Cognito errors
    if (error.name === "UsernameExistsException") {
      res.status(409).json({
        message: "A user with this email already exists",
      });
      return;
    }

    next(error);
  }
};

/**
 * Update a user's superadmin status
 * This endpoint is protected by the superadmin middleware
 */
export const updateUserSuperadmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { superadmin } = req.body;

    if (superadmin === undefined) {
      res.status(400).json({
        message: "Missing required field: superadmin is required",
      });
      return;
    }

    if (typeof superadmin !== "boolean") {
      res.status(400).json({
        message: "Invalid value for superadmin: must be a boolean",
      });
      return;
    }

    // Prevent users from revoking their own superadmin status
    if (req.user?.id === parseInt(userId) && !superadmin) {
      res.status(403).json({
        message: "You cannot revoke your own superadmin status",
      });
      return;
    }

    // First get the user we're trying to modify to check their email
    const userToUpdate = await db.getUserById(parseInt(userId));

    // Prevent anyone from revoking superadmin status for ben@sparrow.dev
    if (userToUpdate.email === "ben@sparrow.dev" && !superadmin) {
      res.status(403).json({
        message: "Cannot revoke superadmin status for this user",
      });
      return;
    }

    const user = await db.updateUserSuperadmin(parseInt(userId), superadmin);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a user
 * This endpoint is protected by the superadmin middleware
 */
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId || isNaN(parseInt(userId))) {
      res.status(400).json({
        message: "Invalid user ID",
      });
      return;
    }

    // Don't allow deleting yourself
    if (req.user?.id === parseInt(userId)) {
      res.status(403).json({
        message: "You cannot delete your own account",
      });
      return;
    }

    // Check if it's a protected user
    const userToDelete = await db.getUserById(parseInt(userId));

    // Special rule: Don't allow deleting ben@sparrow.dev
    if (userToDelete.email === "ben@sparrow.dev") {
      res.status(403).json({
        message: "Cannot delete this protected user",
      });
      return;
    }

    // Delete the user from Cognito first
    try {
      await cognitoService.deleteUserFromCognito(userToDelete.cognitoId);
    } catch (error) {
      console.error("Error deleting user from Cognito:", error);
      // If the user doesn't exist in Cognito, we can still proceed with deleting from our database
      // Only throw if it's not a user not found error
      const cognitoError = error as { name?: string };
      if (cognitoError.name !== "UserNotFoundException") {
        throw error;
      }
    }

    // Delete the user from our database
    const deletedUser = await db.deleteUser(parseInt(userId));

    res.status(200).json({
      success: true,
      message: `User ${deletedUser.email} deleted successfully`,
      data: deletedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a user by ID
 * This endpoint is protected by authentication
 */
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId || isNaN(parseInt(userId))) {
      res.status(400).json({
        message: "Invalid user ID",
      });
      return;
    }

    const user = await db.getUserById(parseInt(userId));

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    if (error.message === "User not found") {
      res.status(404).json({
        message: "User not found",
      });
      return;
    }
    next(error);
  }
};
