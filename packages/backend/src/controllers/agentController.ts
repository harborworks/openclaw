import { NextFunction, Request, Response } from "express";
import * as db from "../db/index.js";

export const getAgents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const agents = await db.getAllAgents();
    res.status(200).json(agents);
  } catch (error) {
    next(error);
  }
};

export const getAgentBySessionKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const agent = await db.getAgentBySessionKey(req.params.sessionKey);
    res.status(200).json(agent);
  } catch (error: any) {
    if (error.message === "Agent not found") {
      res.status(404).json({ message: "Agent not found" });
      return;
    }
    next(error);
  }
};
