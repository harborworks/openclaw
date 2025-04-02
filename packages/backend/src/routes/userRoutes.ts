import { Router } from "express";
import { createUser } from "../controllers/userController";

const router = Router();

// POST /api/users - Create a new user (from presignup)
router.post("/", createUser);

export default router;
