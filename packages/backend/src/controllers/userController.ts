import { NextFunction, Request, Response } from "express";
import * as db from "../db";
import * as cognitoService from "../services/cognitoService";

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
