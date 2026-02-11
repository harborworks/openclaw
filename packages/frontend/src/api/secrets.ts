import { api } from "./client";

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
  const { data } = await api.get<Secret[]>("/secrets");
  return data;
}

export async function upsertSecret(params: {
  name: string;
  value: string;
  category?: "required" | "custom";
  description?: string;
}): Promise<Secret> {
  const { data } = await api.post<Secret>("/secrets", params);
  return data;
}

export async function deleteSecret(id: number): Promise<void> {
  await api.delete(`/secrets/${id}`);
}
