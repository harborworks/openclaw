import { Router } from "express";
import { getAgents, getAgentBySessionKey } from "../controllers/agentController";

const router = Router();

router.get("/", getAgents);
router.get("/:sessionKey", getAgentBySessionKey);

export default router;
