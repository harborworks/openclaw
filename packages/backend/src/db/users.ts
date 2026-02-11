import { orgMembers, orgs, users } from "@harbor-app/schema";
import { eq } from "drizzle-orm";
import config from "../config.js";
import { db } from "./index.js";

/**
 * Find or create a user by Auth0 ID.
 * Called on every authenticated request to keep user record in sync.
 * Auto-promotes emails in SUPERADMIN_EMAILS to superadmin.
 */
export const upsertUser = async (auth0Id: string, email: string, name?: string) => {
  const shouldBeSuperadmin = config.superadminEmails.includes(email.toLowerCase());

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.auth0Id, auth0Id))
    .limit(1);

  if (existing.length > 0) {
    const user = existing[0];
    const needsUpdate =
      user.email !== email ||
      (name && user.name !== name) ||
      (shouldBeSuperadmin && !user.isSuperadmin);

    if (needsUpdate) {
      const [updated] = await db
        .update(users)
        .set({
          email,
          name: name || user.name,
          isSuperadmin: shouldBeSuperadmin || user.isSuperadmin,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();
      return updated;
    }
    return user;
  }

  const [newUser] = await db
    .insert(users)
    .values({ auth0Id, email, name, isSuperadmin: shouldBeSuperadmin })
    .returning();
  return newUser;
};

export const getUserByAuth0Id = async (auth0Id: string) => {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.auth0Id, auth0Id))
    .limit(1);
  return rows[0] ?? null;
};

export const getUserByEmail = async (email: string) => {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return rows[0] ?? null;
};

export const getAllUsers = async () => {
  return db.select().from(users).orderBy(users.email);
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
