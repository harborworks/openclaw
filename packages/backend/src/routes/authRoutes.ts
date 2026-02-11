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

export default router;
