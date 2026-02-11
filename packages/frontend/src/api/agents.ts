import { api } from "./client";

export interface Agent {
  id: number;
  name: string;
  role: string;
  sessionKey: string;
  level: string | null;
  shireId: number | null;
  createdAt: string;
  updatedAt: string;
}

export const getAgents = async (): Promise<Agent[]> => {
  const { data } = await api.get<Agent[]>("/agents");
  return data;
};

export const getAgentBySessionKey = async (
  sessionKey: string
): Promise<Agent> => {
  const { data } = await api.get<Agent>(`/agents/${sessionKey}`);
  return data;
};
