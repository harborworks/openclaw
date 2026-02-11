import { Router, Request, Response, NextFunction } from "express";
import { requireSuperadmin } from "../middlewares/authMiddleware.js";
import {
  getAllOrgs,
  getOrgById,
  getOrgBySlug,
  createOrg,
  deleteOrg,
  getOrgMembers,
  addOrgMember,
  removeOrgMember,
  updateMemberRole,
} from "../db/orgs.js";
import {
  getHarborsByOrg,
  getHarborById,
  createHarbor,
  deleteHarbor,
} from "../db/harbors.js";
import { getAllUsers, getUserByEmail } from "../db/users.js";

const router = Router();

// All admin routes require superadmin
router.use(requireSuperadmin);

// ── Orgs ───────────────────────────────────────────────────────

/** List all orgs */
router.get("/orgs", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const orgs = await getAllOrgs();
    res.json(orgs);
  } catch (err) {
    next(err);
  }
});

/** Create an org */
router.post("/orgs", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, slug } = req.body;
    if (!name || !slug) {
      res.status(400).json({ message: "name and slug are required" });
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      res.status(400).json({ message: "slug must be lowercase alphanumeric with hyphens" });
      return;
    }
    const org = await createOrg(name, slug);
    res.status(201).json(org);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ message: "An org with that slug already exists" });
      return;
    }
    next(err);
  }
});

/** Delete an org */
router.delete("/orgs/:orgId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = Number(req.params.orgId);
    const org = await getOrgById(orgId);
    if (!org) {
      res.status(404).json({ message: "Org not found" });
      return;
    }
    await deleteOrg(orgId);
    res.json({ message: "Org deleted" });
  } catch (err) {
    next(err);
  }
});

// ── Memberships ────────────────────────────────────────────────

/** List members of an org */
router.get("/orgs/:orgId/members", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = Number(req.params.orgId);
    const members = await getOrgMembers(orgId);
    res.json(members);
  } catch (err) {
    next(err);
  }
});

/** Add a member to an org (by userId or email) */
router.post("/orgs/:orgId/members", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = Number(req.params.orgId);
    const { userId, email, role } = req.body;
    const validRoles = ["owner", "admin", "member"];
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({ message: `role must be one of: ${validRoles.join(", ")}` });
      return;
    }

    let targetUserId = userId;
    if (!targetUserId && email) {
      const user = await getUserByEmail(email);
      if (!user) {
        res.status(404).json({ message: `No user found with email: ${email}` });
        return;
      }
      targetUserId = user.id;
    }
    if (!targetUserId) {
      res.status(400).json({ message: "userId or email is required" });
      return;
    }

    const org = await getOrgById(orgId);
    if (!org) {
      res.status(404).json({ message: "Org not found" });
      return;
    }

    const member = await addOrgMember(orgId, targetUserId, role);
    res.status(201).json(member);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ message: "User is already a member of this org" });
      return;
    }
    next(err);
  }
});

/** Update a member's role */
router.patch("/orgs/:orgId/members/:userId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = Number(req.params.orgId);
    const userId = Number(req.params.userId);
    const { role } = req.body;
    const validRoles = ["owner", "admin", "member"];
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({ message: `role must be one of: ${validRoles.join(", ")}` });
      return;
    }
    await updateMemberRole(orgId, userId, role);
    res.json({ message: "Role updated" });
  } catch (err) {
    next(err);
  }
});

/** Remove a member from an org */
router.delete("/orgs/:orgId/members/:userId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = Number(req.params.orgId);
    const userId = Number(req.params.userId);
    await removeOrgMember(orgId, userId);
    res.json({ message: "Member removed" });
  } catch (err) {
    next(err);
  }
});

// ── Harbors ────────────────────────────────────────────────────

/** List harbors for an org */
router.get("/orgs/:orgId/harbors", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = Number(req.params.orgId);
    const harbors = await getHarborsByOrg(orgId);
    res.json(harbors);
  } catch (err) {
    next(err);
  }
});

/** Create a harbor */
router.post("/orgs/:orgId/harbors", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = Number(req.params.orgId);
    const { name, slug } = req.body;
    if (!name || !slug) {
      res.status(400).json({ message: "name and slug are required" });
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      res.status(400).json({ message: "slug must be lowercase alphanumeric with hyphens" });
      return;
    }
    const org = await getOrgById(orgId);
    if (!org) {
      res.status(404).json({ message: "Org not found" });
      return;
    }
    const harbor = await createHarbor(orgId, name, slug);
    res.status(201).json(harbor);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ message: "A harbor with that slug already exists in this org" });
      return;
    }
    next(err);
  }
});

/** Delete a harbor */
router.delete("/harbors/:harborId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const harborId = Number(req.params.harborId);
    const harbor = await getHarborById(harborId);
    if (!harbor) {
      res.status(404).json({ message: "Harbor not found" });
      return;
    }
    await deleteHarbor(harborId);
    res.json({ message: "Harbor deleted" });
  } catch (err) {
    next(err);
  }
});

// ── Users (read-only for admin lookup) ─────────────────────────

/** List all users */
router.get("/users", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

export default router;
