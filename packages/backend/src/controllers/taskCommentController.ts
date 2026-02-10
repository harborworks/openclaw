import { NextFunction, Request, Response } from "express";
import * as db from "../db/index.js";

export const getComments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const taskId = parseInt(req.params.id);
    const comments = await db.getCommentsByTaskId(taskId);
    res.status(200).json(comments);
  } catch (error) {
    next(error);
  }
};

export const createComment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const taskId = parseInt(req.params.id);
    const { fromAgentId, content } = req.body;

    if (!fromAgentId || !content) {
      res
        .status(400)
        .json({ message: "Missing required fields: fromAgentId, content" });
      return;
    }

    const resolvedAgentId = await db.resolveAgentId(fromAgentId);

    const comment = await db.createComment({
      taskId,
      fromAgentId: resolvedAgentId,
      content,
    });
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
};
