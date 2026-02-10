import { NextFunction, Request, Response } from "express";
import * as db from "../db/index.js";

export const getTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { assignee, status } = req.query;
    const tasks = await db.getAllTasks({
      assigneeSessionKey: assignee as string,
      status: status as string,
    });
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = await db.getTaskById(parseInt(req.params.id));
    res.status(200).json(task);
  } catch (error: any) {
    if (error.message === "Task not found") {
      res.status(404).json({ message: "Task not found" });
      return;
    }
    next(error);
  }
};

export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, assigneeIds, createdBy, priority, tags } =
      req.body;

    if (!title) {
      res.status(400).json({ message: "Missing required field: title" });
      return;
    }

    // Resolve createdBy if it's a sessionKey
    let resolvedCreatedBy: number | undefined;
    if (createdBy) {
      resolvedCreatedBy = await db.resolveAgentId(createdBy);
    }

    // Resolve assigneeIds if they're sessionKeys
    let resolvedAssigneeIds: number[] | undefined;
    if (assigneeIds && assigneeIds.length > 0) {
      resolvedAssigneeIds = await Promise.all(
        assigneeIds.map((id: string | number) => db.resolveAgentId(id))
      );
    }

    const task = await db.createTask({
      title,
      description,
      assigneeIds: resolvedAssigneeIds,
      createdBy: resolvedCreatedBy,
      priority,
      tags,
    });
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { status, assigneeIds, fromAgentId, title, description, priority, tags } =
      req.body;

    // Resolve assigneeIds if provided
    let resolvedAssigneeIds: number[] | undefined;
    if (assigneeIds) {
      resolvedAssigneeIds = await Promise.all(
        assigneeIds.map((id: string | number) => db.resolveAgentId(id))
      );
    }

    const task = await db.updateTask(id, {
      title,
      description,
      status,
      assigneeIds: resolvedAssigneeIds,
      priority,
      tags,
    });
    res.status(200).json(task);
  } catch (error: any) {
    if (error.message === "Task not found") {
      res.status(404).json({ message: "Task not found" });
      return;
    }
    next(error);
  }
};
