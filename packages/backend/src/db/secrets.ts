import { secrets } from "@harbor-app/schema";
import { and, eq } from "drizzle-orm";
import { db } from "./index.js";

export const getAllSecrets = async () => {
  return await db.select().from(secrets).orderBy(secrets.name);
};

export const getSecretById = async (id: number) => {
  const rows = await db.select().from(secrets).where(eq(secrets.id, id)).limit(1);
  if (rows.length === 0) throw new Error("Secret not found");
  return rows[0];
};

export const getSecretByName = async (name: string) => {
  const rows = await db
    .select()
    .from(secrets)
    .where(eq(secrets.name, name))
    .limit(1);
  return rows[0] ?? null;
};

export const getPendingSecrets = async () => {
  return await db
    .select()
    .from(secrets)
    .where(eq(secrets.pendingSync, true))
    .orderBy(secrets.name);
};

export const createSecret = async (data: {
  name: string;
  category: "required" | "custom";
  description?: string;
  encryptedValue: string;
  iv: string;
  authTag: string;
  harborId?: number;
}) => {
  const rows = await db
    .insert(secrets)
    .values({
      ...data,
      isSet: true,
      pendingSync: true,
    })
    .returning();
  return rows[0];
};

export const updateSecret = async (
  id: number,
  data: {
    encryptedValue: string;
    iv: string;
    authTag: string;
    description?: string;
  }
) => {
  const rows = await db
    .update(secrets)
    .set({
      ...data,
      pendingSync: true,
      updatedAt: new Date(),
    })
    .where(eq(secrets.id, id))
    .returning();
  return rows[0];
};

export const markSecretSynced = async (id: number) => {
  await db
    .update(secrets)
    .set({ pendingSync: false, updatedAt: new Date() })
    .where(eq(secrets.id, id));
};

export const markAllSynced = async (ids: number[]) => {
  for (const id of ids) {
    await markSecretSynced(id);
  }
};

export const deleteSecret = async (id: number) => {
  await db.delete(secrets).where(eq(secrets.id, id));
};
