import { Router } from "express";
import { getSelf } from "../controllers/selfController";

const router = Router();

// GET /api/self - Get the current user and their memberships
router.get("/", getSelf);

export default router;
