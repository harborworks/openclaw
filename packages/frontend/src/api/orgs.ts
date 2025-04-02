import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export interface Org {
  id: number;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all organizations (superadmin only)
 * @param token JWT token
 */
export const getOrgs = async (token: string): Promise<Org[]> => {
  const response = await axios.get<{ success: boolean; data: Org[] }>(
    `${API_URL}/api/orgs`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.data;
};

/**
 * Create a new organization (superadmin only)
 * @param token JWT token
 * @param slug Slug for the new organization
 */
export const createOrg = async (token: string, slug: string): Promise<Org> => {
  const response = await axios.post<{ success: boolean; data: Org }>(
    `${API_URL}/api/orgs`,
    { slug },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.data;
};

/**
 * Delete an organization (superadmin only)
 * @param token JWT token
 * @param orgId ID of the organization to delete
 */
export const deleteOrg = async (
  token: string,
  orgId: number
): Promise<{ success: boolean; message: string; data: Org }> => {
  const response = await axios.delete<{
    success: boolean;
    message: string;
    data: Org;
  }>(`${API_URL}/api/orgs/${orgId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};
