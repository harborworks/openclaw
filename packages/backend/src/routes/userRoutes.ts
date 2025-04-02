import { Router } from "express";
import {
  createUser,
  getAllUsers,
  inviteUser,
  updateUserSuperadmin,
} from "../controllers/userController";
import { requireSuperadmin } from "../middlewares";

const router = Router();

// POST /api/users - Create a new user (from presignup)
router.post("/", createUser);

// POST /api/users/invite - Invite a new user (superadmin only)
router.post("/invite", requireSuperadmin, inviteUser);

// GET /api/users - Get all users (superadmin only)
router.get("/", requireSuperadmin, getAllUsers);

// PATCH /api/users/:userId/superadmin - Update a user's superadmin status (superadmin only)
router.patch("/:userId/superadmin", requireSuperadmin, updateUserSuperadmin);

export default router;
