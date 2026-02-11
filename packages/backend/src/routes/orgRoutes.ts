import { Router, Request, Response, NextFunction } from "express";
import { getOrgBySlug } from "../db/orgs.js";
import { getHarborsByOrg, getHarborBySlug } from "../db/harbors.js";
import { requireOrgMember } from "../middlewares/authMiddleware.js";

const router = Router();

// All org routes require membership
router.use(requireOrgMember);

/** Resolve org by slug — returns org + harbors */
router.get(
  "/:orgSlug",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const org = await getOrgBySlug(req.params.orgSlug);
      if (!org) {
        res.status(404).json({ message: "Org not found" });
        return;
      }
      if (!req.user!.orgIds.includes(org.id)) {
        res.status(403).json({ message: "Not a member of this org" });
        return;
      }
      const harbors = await getHarborsByOrg(org.id);
      res.json({ ...org, harbors });
    } catch (error) {
      next(error);
    }
  }
);

/** Resolve harbor by org slug + harbor slug */
router.get(
  "/:orgSlug/:harborSlug",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const org = await getOrgBySlug(req.params.orgSlug);
      if (!org) {
        res.status(404).json({ message: "Org not found" });
        return;
      }
      if (!req.user!.orgIds.includes(org.id)) {
        res.status(403).json({ message: "Not a member of this org" });
        return;
      }
      const harbor = await getHarborBySlug(org.id, req.params.harborSlug);
      if (!harbor) {
        res.status(404).json({ message: "Harbor not found" });
        return;
      }
      res.json({ org, harbor });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
