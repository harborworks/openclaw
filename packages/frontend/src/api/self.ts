import axios from "axios";
import { Org } from "./orgs";
import { User } from "./users";

const API_URL = import.meta.env.VITE_API_URL;

export interface UserMembership extends Org {
  membershipId: number;
  isAdmin: boolean;
}

export interface SelfResponse {
  user: User;
  memberships: UserMembership[];
}

/**
 * Get the current authenticated user and their memberships
 * @param token JWT token for authorization
 * @returns User and their memberships
 */
export const getSelf = async (token: string): Promise<SelfResponse> => {
  try {
    const response = await axios.get(`${API_URL}/api/self`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching self data:", error);
    throw error;
  }
};
