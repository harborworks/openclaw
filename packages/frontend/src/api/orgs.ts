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

/**
 * Get organizations for the current user
 * @param token JWT token
 */
export const getUserOrgs = async (token: string): Promise<Org[]> => {
  // Instead of a non-existent endpoint, use the jobs API to get user's organizations
  const response = await axios.get<{ success: boolean; data: any[] }>(
    `${API_URL}/api/jobs`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  // If no jobs, return an empty array
  if (!response.data.data || response.data.data.length === 0) {
    return [];
  }

  // Extract unique organization IDs from jobs
  // For testing purposes, if we don't have any real orgs, use a default one
  const orgIds = [...new Set(response.data.data.map((job) => job.orgId))];

  if (orgIds.length === 0) {
    // For development only: provide a default org if none exists
    return [
      {
        id: 1,
        slug: "default-org",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  // Get details for each organization
  // In a production environment, we would make API calls to get the actual org details
  // For now, return a simplified list based on the IDs we found
  return orgIds.map((id) => ({
    id,
    slug: `org-${id}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
};
