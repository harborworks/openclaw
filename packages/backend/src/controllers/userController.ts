import { NextFunction, Request, Response } from "express";
import * as db from "../db";

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { cognitoId, email } = req.body;

    if (!cognitoId || !email) {
      return res.status(400).json({
        message: "Missing required fields: cognitoId and email are required",
      });
    }

    // Create the user
    const user = await db.createUser(cognitoId, email);

    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
