import { Router, Request, Response, NextFunction } from "express";
import * as db from "../db/index.js";
import { requireOrgMember } from "../middlewares/authMiddleware";

const router = Router();

// All org routes require membership
router.use(requireOrgMember);

/** List orgs the current user belongs to */
router.get("/", (req: Request, res: Response) => {
  res.json(req.user!.memberships);
});

/** Get harbors for an org (user must be a member) */
router.get(
  "/:orgId/harbors",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = Number(req.params.orgId);
      if (!req.user!.orgIds.includes(orgId)) {
        res.status(403).json({ message: "Not a member of this org" });
        return;
      }
      const harbors = await db.getHarborsByOrg(orgId);
      res.json(harbors);
    } catch (error) {
      next(error);
    }
  }
);

/** Create a harbor in an org */
router.post(
  "/:orgId/harbors",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = Number(req.params.orgId);
      if (!req.user!.orgIds.includes(orgId)) {
        res.status(403).json({ message: "Not a member of this org" });
        return;
      }
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ message: "name is required" });
        return;
      }
      const harbor = await db.createHarbor(orgId, name);
      res.status(201).json(harbor);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
