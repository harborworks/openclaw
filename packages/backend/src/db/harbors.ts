import { harbors } from "@harbor-app/schema";
import { eq } from "drizzle-orm";
import { db } from "./index.js";

export const getHarborsByOrg = async (orgId: number) => {
  return db.select().from(harbors).where(eq(harbors.orgId, orgId)).orderBy(harbors.name);
};

export const getHarborById = async (id: number) => {
  const rows = await db.select().from(harbors).where(eq(harbors.id, id)).limit(1);
  return rows[0] ?? null;
};

export const createHarbor = async (orgId: number, name: string) => {
  const rows = await db.insert(harbors).values({ orgId, name }).returning();
  return rows[0];
};

export const deleteHarbor = async (id: number) => {
  await db.delete(harbors).where(eq(harbors.id, id));
};
