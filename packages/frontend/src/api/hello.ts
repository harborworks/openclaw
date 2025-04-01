import { users } from "@sparrow-tags/schema";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export const hello = async (token: string) => {
  type HelloResponse = {
    user: typeof users.$inferSelect;
  };
  const response = await axios.get<HelloResponse>(`${API_URL}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const { user } = response.data;
  return user;
};
