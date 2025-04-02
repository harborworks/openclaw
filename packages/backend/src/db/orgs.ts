import { orgs } from "@sparrow-tags/schema";
import { eq } from "drizzle-orm";
import { db } from "./index.js";

// Function to get an organization by ID
export const getOrgById = async (orgId: number) => {
  const orgRows = await db
    .select()
    .from(orgs)
    .where(eq(orgs.id, orgId))
    .limit(1);

  if (orgRows.length === 0) {
    throw new Error("Organization not found");
  }

  return orgRows[0];
};

// Function to get all organizations
export const getAllOrgs = async () => {
  return await db.select().from(orgs).orderBy(orgs.createdAt);
};

// Function to create a new organization
export const createOrg = async (slug: string) => {
  // Check if org with the same slug already exists
  const existingOrgs = await db
    .select()
    .from(orgs)
    .where(eq(orgs.slug, slug))
    .limit(1);

  if (existingOrgs.length > 0) {
    throw new Error("Organization with this slug already exists");
  }

  const [org] = await db
    .insert(orgs)
    .values({
      slug,
    })
    .returning();

  return org;
};

// Function to delete an organization
export const deleteOrg = async (orgId: number) => {
  const [deletedOrg] = await db
    .delete(orgs)
    .where(eq(orgs.id, orgId))
    .returning();

  if (!deletedOrg) {
    throw new Error("Organization not found");
  }

  return deletedOrg;
};
