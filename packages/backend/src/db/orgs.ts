import { orgMembers, orgs } from "@harbor-app/schema";
import { and, eq } from "drizzle-orm";
import { db } from "./index.js";

export const getAllOrgs = async () => {
  return db.select().from(orgs).orderBy(orgs.name);
};

export const getOrgById = async (id: number) => {
  const rows = await db.select().from(orgs).where(eq(orgs.id, id)).limit(1);
  return rows[0] ?? null;
};

export const getOrgBySlug = async (slug: string) => {
  const rows = await db.select().from(orgs).where(eq(orgs.slug, slug)).limit(1);
  return rows[0] ?? null;
};

export const createOrg = async (name: string, slug: string) => {
  const rows = await db.insert(orgs).values({ name, slug }).returning();
  return rows[0];
};

export const deleteOrg = async (id: number) => {
  await db.delete(orgs).where(eq(orgs.id, id));
};

// ── Members ────────────────────────────────────────────────────

export const getOrgMembers = async (orgId: number) => {
  return db.select().from(orgMembers).where(eq(orgMembers.orgId, orgId));
};

export const addOrgMember = async (
  orgId: number,
  userId: number,
  role: "owner" | "admin" | "member" = "member"
) => {
  const rows = await db
    .insert(orgMembers)
    .values({ orgId, userId, role })
    .returning();
  return rows[0];
};

export const removeOrgMember = async (orgId: number, userId: number) => {
  await db
    .delete(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));
};

export const updateMemberRole = async (
  orgId: number,
  userId: number,
  role: "owner" | "admin" | "member"
) => {
  await db
    .update(orgMembers)
    .set({ role, updatedAt: new Date() })
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));
};
