import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";

export interface Secret {
  id: number;
  name: string;
  category: "required" | "custom";
  description: string | null;
  isSet: boolean;
  pendingSync: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getSecrets(): Promise<Secret[]> {
  const { data } = await axios.get<Secret[]>(`${API_URL}/api/secrets`, {
    withCredentials: true,
  });
  return data;
}

export async function upsertSecret(params: {
  name: string;
  value: string;
  category?: "required" | "custom";
  description?: string;
}): Promise<Secret> {
  const { data } = await axios.post<Secret>(`${API_URL}/api/secrets`, params, {
    withCredentials: true,
  });
  return data;
}

export async function deleteSecret(id: number): Promise<void> {
  await axios.delete(`${API_URL}/api/secrets/${id}`, {
    withCredentials: true,
  });
}
