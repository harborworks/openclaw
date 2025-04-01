import { NextFunction, Request, Response } from "express";

export const getHello = (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      message: "Hello, world!",
      user: req.user || { email: "not authenticated" },
    });
  } catch (error) {
    next(error);
  }
};
