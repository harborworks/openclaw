import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export interface User {
  id: number;
  email: string;
  superadmin: boolean;
  createdAt: string;
  updatedAt: string;
  cognitoId: string;
}

interface InviteUserResponse {
  success: boolean;
  message: string;
  cognitoUsername?: string;
}

/**
 * Get all users (superadmin only)
 * @param token JWT token
 */
export const getUsers = async (token: string): Promise<User[]> => {
  const response = await axios.get<{ success: boolean; data: User[] }>(
    `${API_URL}/api/users`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.data;
};

/**
 * Update a user's superadmin status (superadmin only)
 * @param token JWT token
 * @param userId ID of the user to update
 * @param superadmin New superadmin status
 */
export const updateUserSuperadmin = async (
  token: string,
  userId: number,
  superadmin: boolean
): Promise<User> => {
  const response = await axios.patch<{ success: boolean; data: User }>(
    `${API_URL}/api/users/${userId}/superadmin`,
    { superadmin },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.data;
};

/**
 * Invites a new user to the application (superadmin only)
 * @param token JWT token
 * @param email Email of the user to invite
 */
export const inviteUser = async (
  token: string,
  email: string
): Promise<InviteUserResponse> => {
  const response = await axios.post<InviteUserResponse>(
    `${API_URL}/api/users/invite`,
    { email },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

/**
 * Delete a user (superadmin only)
 * @param token JWT token
 * @param userId ID of the user to delete
 */
export const deleteUser = async (
  token: string,
  userId: number
): Promise<{ success: boolean; message: string; data: User }> => {
  const response = await axios.delete<{
    success: boolean;
    message: string;
    data: User;
  }>(`${API_URL}/api/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};
