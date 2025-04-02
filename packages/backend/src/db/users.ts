import { users } from "@sparrow-tags/schema";
import { eq } from "drizzle-orm";
import { db } from "./index.js";

export const getUserById = async (userId: number) => {
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (userRows.length === 0) {
    throw new Error("User not found");
  }
  const user = userRows[0];
  return user;
};

export const getUserByCognitoId = async (cognitoId: string) => {
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.cognitoId, cognitoId))
    .limit(1);
  if (userRows.length === 0) {
    throw new Error("User not found");
  }
  const user = userRows[0];
  return user;
};

// Function to get all users
export const getAllUsers = async () => {
  return await db.select().from(users).orderBy(users.createdAt);
};

// Function to create a new non-superadmin user
export const createUser = async (cognitoId: string, email: string) => {
  const [user] = await db
    .insert(users)
    .values({
      cognitoId,
      email,
      superadmin: false,
    })
    .returning();

  return user;
};

// Function to update a user's superadmin status
export const updateUserSuperadmin = async (
  userId: number,
  superadmin: boolean
) => {
  const [updatedUser] = await db
    .update(users)
    .set({ superadmin })
    .where(eq(users.id, userId))
    .returning();

  if (!updatedUser) {
    throw new Error("User not found");
  }

  return updatedUser;
};
