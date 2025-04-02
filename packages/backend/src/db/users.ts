import { users } from "@sparrow-tags/schema";
import { eq } from "drizzle-orm";
import { db } from "./index.js";

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
