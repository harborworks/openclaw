import { Router } from "express";
import {
  listSecrets,
  upsertSecret,
  removeSecret,
  fetchPendingSecrets,
  fetchAllDecrypted,
} from "../controllers/secretController";

const router = Router();

router.get("/", listSecrets);
router.post("/", upsertSecret);
router.delete("/:id", removeSecret);
router.get("/pending", fetchPendingSecrets);
router.get("/all-decrypted", fetchAllDecrypted);

export default router;
