import axios from "axios";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  createElement,
} from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

export interface AuthState {
  authenticated: boolean;
  loading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  authenticated: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/auth/me`, { withCredentials: true })
      .then((r) => setAuthenticated(r.data.authenticated))
      .catch(() => setAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (password: string) => {
    const res = await axios.post(
      `${API_URL}/api/auth/login`,
      { password },
      { withCredentials: true }
    );
    if (res.data.success) setAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
    setAuthenticated(false);
  }, []);

  return createElement(
    AuthContext.Provider,
    { value: { authenticated, loading, login, logout } },
    children
  );
}
