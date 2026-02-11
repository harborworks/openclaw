import { Router, Request, Response } from "express";
import config from "../config.js";
import { getOrgBySlug } from "../db/orgs.js";
import { getHarborsByOrg, getHarborBySlug } from "../db/harbors.js";

const router = Router();

/** Return Cognito config for the frontend SPA */
router.get("/config", (_req: Request, res: Response) => {
  res.json({
    userPoolId: config.cognitoUserPoolId,
    clientId: config.cognitoClientId,
    region: config.cognitoRegion,
  });
});

/** Return current user info + org memberships */
router.get("/me", (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ authenticated: false });
    return;
  }
  res.json({
    authenticated: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      isSuperadmin: req.user.isSuperadmin,
    },
    memberships: req.user.memberships,
  });
});

/**
 * Get the user's default org/harbor redirect.
 * Returns { orgSlug, harborSlug } or an error.
 */
router.get("/default", async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ authenticated: false });
    return;
  }
  if (req.user.memberships.length === 0) {
    res.status(404).json({ message: "No organization membership found" });
    return;
  }
  // Pick first org
  const membership = req.user.memberships[0];
  const harbors = await getHarborsByOrg(membership.orgId);
  if (harbors.length === 0) {
    res.status(404).json({
      message: "No harbors found in your organization",
      orgSlug: membership.orgSlug,
    });
    return;
  }
  res.json({
    orgSlug: membership.orgSlug,
    harborSlug: harbors[0].slug,
  });
});

export default router;
