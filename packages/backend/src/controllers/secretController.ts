import type { Request, Response, NextFunction } from "express";
import {
  getAllSecrets,
  getSecretByName,
  createSecret,
  updateSecret,
  deleteSecret,
  getPendingSecrets,
  markAllSynced,
} from "../db/index.js";
import { encrypt, decrypt } from "../crypto.js";

/** GET /api/secrets — list all secrets (metadata only, no values) */
export const listSecrets = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const rows = await getAllSecrets();
    const result = rows.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description,
      isSet: s.isSet,
      pendingSync: s.pendingSync,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/** POST /api/secrets — create or update a secret */
export const upsertSecret = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, value, category, description } = req.body;
    if (!name || !value) {
      res.status(400).json({ error: "name and value are required" });
      return;
    }

    const encrypted = encrypt(value);
    const existing = await getSecretByName(name);

    if (existing) {
      const updated = await updateSecret(existing.id, {
        ...encrypted,
        description: description ?? existing.description,
      });
      res.json({
        id: updated.id,
        name: updated.name,
        category: updated.category,
        description: updated.description,
        isSet: updated.isSet,
        pendingSync: updated.pendingSync,
      });
    } else {
      const created = await createSecret({
        name,
        category: category || "custom",
        description,
        ...encrypted,
      });
      res.status(201).json({
        id: created.id,
        name: created.name,
        category: created.category,
        description: created.description,
        isSet: created.isSet,
        pendingSync: created.pendingSync,
      });
    }
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/secrets/:id — delete a secret */
export const removeSecret = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = parseInt(req.params.id, 10);
    await deleteSecret(id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/secrets/pending — get pending secrets with decrypted values.
 * Only accessible via API key (daemon use). Returns name=value pairs
 * and marks them as synced.
 */
export const fetchPendingSecrets = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const pending = await getPendingSecrets();
    if (pending.length === 0) {
      res.json({ secrets: [], count: 0 });
      return;
    }

    const decrypted = pending
      .filter((s) => s.encryptedValue && s.iv && s.authTag)
      .map((s) => ({
        id: s.id,
        name: s.name,
        value: decrypt({
          encryptedValue: s.encryptedValue!,
          iv: s.iv!,
          authTag: s.authTag!,
        }),
      }));

    // Mark as synced
    await markAllSynced(decrypted.map((s) => s.id));

    res.json({ secrets: decrypted, count: decrypted.length });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/secrets/all-decrypted — get ALL secrets with decrypted values.
 * Only accessible via API key (daemon use). For writing the full .env file.
 */
export const fetchAllDecrypted = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const all = await getAllSecrets();
    const decrypted = all
      .filter((s) => s.encryptedValue && s.iv && s.authTag && s.isSet)
      .map((s) => ({
        id: s.id,
        name: s.name,
        value: decrypt({
          encryptedValue: s.encryptedValue!,
          iv: s.iv!,
          authTag: s.authTag!,
        }),
      }));

    res.json({ secrets: decrypted, count: decrypted.length });
  } catch (err) {
    next(err);
  }
};
