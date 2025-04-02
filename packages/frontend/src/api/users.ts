import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

interface InviteUserResponse {
  success: boolean;
  message: string;
  cognitoUsername?: string;
}

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
