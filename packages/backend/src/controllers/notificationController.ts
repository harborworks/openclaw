import { NextFunction, Request, Response } from "express";
import * as db from "../db/index.js";

export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { agent } = req.query;
    if (!agent) {
      res.status(400).json({ message: "Missing required query: agent" });
      return;
    }
    const notifications = await db.getUndeliveredNotifications(agent as string);
    res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
};

export const markDelivered = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, ids } = req.body;
    const toMark = ids || (id ? [id] : []);
    if (toMark.length === 0) {
      res.status(400).json({ message: "Missing id or ids" });
      return;
    }
    await db.markDelivered(toMark);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
