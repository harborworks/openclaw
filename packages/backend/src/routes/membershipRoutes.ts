import express from "express";
import {
  createMembership,
  deleteMembership,
  getAllMemberships,
  updateMembershipAdmin,
} from "../controllers/membershipController";
import { requireSuperadmin } from "../middlewares";

const router = express.Router();

// All membership routes require superadmin access
router.use(requireSuperadmin);

// Get all memberships
router.get("/", getAllMemberships);

// Create a new membership
router.post("/", createMembership);

// Update a membership's admin status
router.patch("/:membershipId/admin", updateMembershipAdmin);

// Delete a membership
router.delete("/:membershipId", deleteMembership);

export default router;
