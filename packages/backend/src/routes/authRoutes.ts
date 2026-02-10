import { Router, Request, Response } from "express";
import config from "../config";

const router = Router();

router.post("/login", (req: Request, res: Response) => {
  const { password } = req.body;
  if (password === config.adminPassword) {
    res.cookie("session", config.sessionSecret, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.json({ success: true });
  } else {
    res.status(401).json({ message: "Invalid password" });
  }
});

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("session");
  res.json({ success: true });
});

router.get("/me", (req: Request, res: Response) => {
  const sessionToken = req.cookies?.session;
  const apiKey = req.headers["x-api-key"] as string;
  const authenticated =
    (sessionToken && sessionToken === config.sessionSecret) ||
    (apiKey && apiKey === config.apiKey);
  res.json({ authenticated: !!authenticated });
});

export default router;
