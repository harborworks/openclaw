import { orgMembers, orgs, users } from "@harbor-app/schema";
import { eq } from "drizzle-orm";
import { db } from "./index.js";

/**
 * Find or create a user by Auth0 ID.
 * Called on every authenticated request to keep user record in sync.
 */
export const upsertUser = async (auth0Id: string, email: string, name?: string) => {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.auth0Id, auth0Id))
    .limit(1);

  if (existing.length > 0) {
    // Update email/name if changed
    if (existing[0].email !== email || (name && existing[0].name !== name)) {
      await db
        .update(users)
        .set({ email, name: name || existing[0].name, updatedAt: new Date() })
        .where(eq(users.id, existing[0].id));
    }
    return existing[0];
  }

  const rows = await db.insert(users).values({ auth0Id, email, name }).returning();
  return rows[0];
};

export const getUserByAuth0Id = async (auth0Id: string) => {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.auth0Id, auth0Id))
    .limit(1);
  return rows[0] ?? null;
};

/**
 * Get all org memberships for a user (with org details).
 */
export const getUserMemberships = async (userId: number) => {
  return db
    .select({
      orgId: orgMembers.orgId,
      role: orgMembers.role,
      orgName: orgs.name,
      orgSlug: orgs.slug,
    })
    .from(orgMembers)
    .innerJoin(orgs, eq(orgMembers.orgId, orgs.id))
    .where(eq(orgMembers.userId, userId));
};
