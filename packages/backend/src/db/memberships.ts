import { memberships, orgs, users } from "@sparrow-tags/schema";
import { and, eq } from "drizzle-orm";
import { db } from ".";

// Get all memberships with user and org details
export const getAllMemberships = async () => {
  return db
    .select({
      id: memberships.id,
      userId: memberships.userId,
      userEmail: users.email,
      orgId: memberships.orgId,
      orgSlug: orgs.slug,
      admin: memberships.admin,
      createdAt: memberships.createdAt,
      updatedAt: memberships.updatedAt,
    })
    .from(memberships)
    .leftJoin(users, eq(memberships.userId, users.id))
    .leftJoin(orgs, eq(memberships.orgId, orgs.id));
};

// Get membership by ID with user and org details
export const getMembershipWithDetails = async (id: number) => {
  const result = await db
    .select({
      id: memberships.id,
      userId: memberships.userId,
      userEmail: users.email,
      orgId: memberships.orgId,
      orgSlug: orgs.slug,
      admin: memberships.admin,
      createdAt: memberships.createdAt,
      updatedAt: memberships.updatedAt,
    })
    .from(memberships)
    .leftJoin(users, eq(memberships.userId, users.id))
    .leftJoin(orgs, eq(memberships.orgId, orgs.id))
    .where(eq(memberships.id, id))
    .limit(1);

  return result[0] || null;
};

// Get membership by ID
export const getMembershipById = async (id: number) => {
  const result = await db
    .select()
    .from(memberships)
    .where(eq(memberships.id, id))
    .limit(1);

  return result[0] || null;
};

// Get all organizations that a user is a member of
export const getUserOrgs = async (userId: number) => {
  return db
    .select({
      id: orgs.id,
      slug: orgs.slug,
      membershipId: memberships.id,
      isAdmin: memberships.admin,
      createdAt: orgs.createdAt,
      updatedAt: orgs.updatedAt,
    })
    .from(memberships)
    .leftJoin(orgs, eq(memberships.orgId, orgs.id))
    .where(eq(memberships.userId, userId))
    .orderBy(orgs.createdAt);
};

// Check if membership exists
export const checkMembershipExists = async (userId: number, orgId: number) => {
  const result = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)))
    .limit(1);

  return Boolean(result.length);
};

// Create a new membership
export const createMembership = async (data: {
  userId: number;
  orgId: number;
  admin: boolean;
}) => {
  // Check if membership already exists
  const exists = await checkMembershipExists(data.userId, data.orgId);
  if (exists) {
    throw new Error("Membership already exists for this user and organization");
  }

  // Verify user exists
  const userExists = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, data.userId))
    .limit(1);

  if (!userExists.length) {
    throw new Error("User not found");
  }

  // Verify org exists
  const orgExists = await db
    .select({ id: orgs.id })
    .from(orgs)
    .where(eq(orgs.id, data.orgId))
    .limit(1);

  if (!orgExists.length) {
    throw new Error("Organization not found");
  }

  // Create membership
  const result = await db
    .insert(memberships)
    .values({
      userId: data.userId,
      orgId: data.orgId,
      admin: data.admin,
    })
    .returning();

  return result[0];
};

// Update membership admin status
export const updateMembershipAdmin = async (id: number, admin: boolean) => {
  const result = await db
    .update(memberships)
    .set({ admin })
    .where(eq(memberships.id, id))
    .returning();

  return result[0];
};

// Delete a membership
export const deleteMembership = async (id: number) => {
  const result = await db
    .delete(memberships)
    .where(eq(memberships.id, id))
    .returning();

  return result[0];
};
