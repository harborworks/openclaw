import { Router } from "express";
import { getNotifications, markDelivered } from "../controllers/notificationController";

const router = Router();

router.get("/", getNotifications);
router.post("/mark-delivered", markDelivered);

export default router;
