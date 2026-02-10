import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";

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
  const response = await axios.get(`${API_URL}/api/agents`, {
    withCredentials: true,
  });
  return response.data;
};

export const getAgentBySessionKey = async (
  sessionKey: string
): Promise<Agent> => {
  const response = await axios.get(`${API_URL}/api/agents/${sessionKey}`, {
    withCredentials: true,
  });
  return response.data;
};
