import { Router } from "express";
import { createUser, inviteUser } from "../controllers/userController";
import { requireSuperadmin } from "../middlewares";

const router = Router();

// POST /api/users - Create a new user (from presignup)
router.post("/", createUser);

// POST /api/users/invite - Invite a new user (superadmin only)
router.post("/invite", requireSuperadmin, inviteUser);

export default router;
