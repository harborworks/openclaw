import { users } from "@sparrow-tags/schema";
import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL!;

type HelloResponse = {
  message: string;
  user: typeof users.$inferSelect;
};

export const getSelf = async () => {
  const response = await axios.get<HelloResponse>(`${apiUrl}/`);
  const { user } = response.data;
  return user;
};
