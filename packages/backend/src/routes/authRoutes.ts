import { Router, Request, Response } from "express";
import config from "../config";

const router = Router();

/** Return Auth0 config for the frontend SPA */
router.get("/config", (_req: Request, res: Response) => {
  res.json({
    domain: config.auth0Domain,
    clientId: config.auth0ClientId,
    audience: config.auth0Audience,
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
    },
    memberships: req.user.memberships,
  });
});

export default router;
