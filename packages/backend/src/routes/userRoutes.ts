import { Router } from "express";
import * as userController from "../controllers/userController";

const router = Router();

// POST /api/users - Create a new user (from presignup)
router.post("/", userController.createUser);

export default router;
