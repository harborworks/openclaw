import { Router } from "express";
import { getTasks, getTask, createTask, updateTask } from "../controllers/taskController";
import { getComments, createComment } from "../controllers/taskCommentController";

const router = Router();

router.get("/", getTasks);
router.get("/:id", getTask);
router.post("/", createTask);
router.patch("/:id", updateTask);

// Task comments (nested under tasks)
router.get("/:id/messages", getComments);
router.post("/:id/messages", createComment);

export default router;
