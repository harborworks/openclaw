import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
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
import { setTokenGetter } from "./api/client";

const API_URL = import.meta.env.VITE_API_URL || "";

export interface AuthState {
  authenticated: boolean;
  loading: boolean;
  login: () => Promise<void>;
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
  const [auth0Config, setAuth0Config] = useState<{
    domain: string;
    clientId: string;
    audience: string;
  } | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/auth/config`)
      .then((r) => {
        if (r.data.domain && r.data.clientId) {
          setAuth0Config(r.data);
        }
      })
      .catch(() => {})
      .finally(() => setConfigLoading(false));
  }, []);

  if (configLoading) return null;

  if (!auth0Config) {
    // Auth0 not configured — show error
    return createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontFamily: "system-ui",
          color: "#666",
        },
      },
      "Auth0 not configured. Set AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_AUDIENCE on the backend."
    );
  }

  return createElement(
    Auth0Provider,
    {
      domain: auth0Config.domain,
      clientId: auth0Config.clientId,
      authorizationParams: {
        redirect_uri: window.location.origin,
        audience: auth0Config.audience,
      },
    },
    createElement(Auth0Inner, null, children)
  );
}

function Auth0Inner({ children }: { children?: ReactNode }) {
  const {
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  // Wire up the API client with the token getter
  useEffect(() => {
    if (isAuthenticated) {
      setTokenGetter(() => getAccessTokenSilently());
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  const login = useCallback(async () => {
    await loginWithRedirect();
  }, [loginWithRedirect]);

  const logout = useCallback(async () => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  }, [auth0Logout]);

  return createElement(
    AuthContext.Provider,
    {
      value: {
        authenticated: isAuthenticated,
        loading: isLoading,
        login,
        logout,
      },
    },
    children
  );
}
