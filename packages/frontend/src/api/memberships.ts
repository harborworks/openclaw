import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export interface Membership {
  id: number;
  userId: number;
  userEmail: string;
  orgId: number;
  orgSlug: string;
  admin: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetches all memberships from the API
 * @param token JWT token for authorization
 * @returns Array of Membership objects
 */
export const getMemberships = async (token: string): Promise<Membership[]> => {
  try {
    const response = await axios.get(`${API_URL}/api/memberships`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching memberships:", error);
    throw error;
  }
};

/**
 * Creates a new membership
 * @param token JWT token for authorization
 * @param userId User ID
 * @param orgId Organization ID
 * @param admin Whether the user is an admin of the organization
 * @returns Created Membership object
 */
export const createMembership = async (
  token: string,
  userId: number,
  orgId: number,
  admin: boolean = false
): Promise<Membership> => {
  try {
    const response = await axios.post(
      `${API_URL}/api/memberships`,
      {
        userId,
        orgId,
        admin,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Error creating membership:", error);
    throw error;
  }
};

/**
 * Updates a membership's admin status
 * @param token JWT token for authorization
 * @param membershipId Membership ID
 * @param admin New admin status
 * @returns Updated Membership object
 */
export const updateMembershipAdmin = async (
  token: string,
  membershipId: number,
  admin: boolean
): Promise<Membership> => {
  try {
    const response = await axios.patch(
      `${API_URL}/api/memberships/${membershipId}/admin`,
      {
        admin,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Error updating membership admin status:", error);
    throw error;
  }
};

/**
 * Deletes a membership
 * @param token JWT token for authorization
 * @param membershipId Membership ID to delete
 * @returns The deleted Membership object
 */
export const deleteMembership = async (
  token: string,
  membershipId: number
): Promise<{ message: string; data: Membership }> => {
  try {
    const response = await axios.delete(
      `${API_URL}/api/memberships/${membershipId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting membership:", error);
    throw error;
  }
};
