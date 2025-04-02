import { Router } from "express";
import { createOrg, deleteOrg, getAllOrgs } from "../controllers/orgController";
import { requireSuperadmin } from "../middlewares";

const router = Router();

// GET /api/orgs - Get all organizations (superadmin only)
router.get("/", requireSuperadmin, getAllOrgs);

// POST /api/orgs - Create a new organization (superadmin only)
router.post("/", requireSuperadmin, createOrg);

// DELETE /api/orgs/:orgId - Delete an organization (superadmin only)
router.delete("/:orgId", requireSuperadmin, deleteOrg);

export default router;
