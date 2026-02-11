import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";

/** Shared axios instance — auth interceptor attached by AuthProvider */
export const api = axios.create({
  baseURL: `${API_URL}/api`,
});

let _getToken: (() => Promise<string | null>) | null = null;

export function setTokenGetter(fn: () => Promise<string | null>) {
  if (_getToken) return; // already set
  _getToken = fn;
  api.interceptors.request.use(async (config) => {
    const token = await fn();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
}
