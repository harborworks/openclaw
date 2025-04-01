import { NextFunction, Request, Response } from "express";
import { User } from "../models/user";

export const getHello = (_: Request, res: Response, next: NextFunction) => {
  try {
    const user: User = {
      id: 1,
      cognitoId: "123",
      email: "ben@sparrow.dev",
      superadmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    res.json({ message: "Hello, world!", user });
  } catch (error) {
    next(error);
  }
};
