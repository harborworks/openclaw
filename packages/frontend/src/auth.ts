import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from "amazon-cognito-identity-js";
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

// ── Types ──────────────────────────────────────────────────────

export interface AuthState {
  authenticated: boolean;
  loading: boolean;
  isSuperadmin: boolean;
  user: { id: number; email: string; name?: string } | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Set after a failed login that requires new password */
  needsNewPassword: boolean;
  completeNewPassword: (newPassword: string, name?: string) => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthState>({
  authenticated: false,
  loading: true,
  isSuperadmin: false,
  user: null,
  login: async () => {},
  logout: async () => {},
  needsNewPassword: false,
  completeNewPassword: async () => {},
  error: null,
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

// ── Cognito pool (lazy init from backend config) ───────────────

let userPool: CognitoUserPool | null = null;

function getUserPool(poolId: string, clientId: string): CognitoUserPool {
  if (!userPool) {
    userPool = new CognitoUserPool({
      UserPoolId: poolId,
      ClientId: clientId,
    });
  }
  return userPool;
}

// ── Provider ───────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [cognitoConfig, setCognitoConfig] = useState<{
    userPoolId: string;
    clientId: string;
    region: string;
  } | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{
    user: { id: number; email: string; name?: string } | null;
    isSuperadmin: boolean;
  }>({ user: null, isSuperadmin: false });
  const [error, setError] = useState<string | null>(null);
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [pendingCognitoUser, setPendingCognitoUser] = useState<CognitoUser | null>(null);
  const [, setPendingUserAttributes] = useState<any>(null);

  // 1. Fetch auth config from backend
  useEffect(() => {
    axios
      .get(`${API_URL}/api/auth/config`)
      .then((r) => {
        if (r.data.userPoolId && r.data.clientId) {
          setCognitoConfig(r.data);
        }
      })
      .catch(() => {})
      .finally(() => setConfigLoading(false));
  }, []);

  // 2. Check for existing session on load
  useEffect(() => {
    if (!cognitoConfig) {
      setSessionLoading(false);
      return;
    }
    const pool = getUserPool(cognitoConfig.userPoolId, cognitoConfig.clientId);
    const currentUser = pool.getCurrentUser();
    if (!currentUser) {
      setSessionLoading(false);
      return;
    }
    currentUser.getSession((err: any, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) {
        setSessionLoading(false);
        return;
      }
      const token = session.getIdToken().getJwtToken();
      setTokenGetter(() => Promise.resolve(token));
      setAuthenticated(true);
      // Fetch user info from backend
      fetchMe(token);
      setSessionLoading(false);
    });
  }, [cognitoConfig]);

  const fetchMe = async (token: string) => {
    try {
      const { data } = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.authenticated) {
        setUserInfo({
          user: data.user,
          isSuperadmin: data.user.isSuperadmin ?? false,
        });
      }
    } catch {
      // ignore
    }
  };

  // Wrap token getter to always get fresh token
  const getToken = useCallback((): Promise<string | null> => {
    if (!cognitoConfig) return Promise.resolve(null);
    const pool = getUserPool(cognitoConfig.userPoolId, cognitoConfig.clientId);
    const currentUser = pool.getCurrentUser();
    if (!currentUser) return Promise.resolve(null);
    return new Promise((resolve) => {
      currentUser.getSession((err: any, session: CognitoUserSession | null) => {
        if (err || !session?.isValid()) return resolve(null);
        resolve(session.getIdToken().getJwtToken());
      });
    });
  }, [cognitoConfig]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!cognitoConfig) throw new Error("Auth not configured");
      setError(null);
      const pool = getUserPool(cognitoConfig.userPoolId, cognitoConfig.clientId);
      const cognitoUser = new CognitoUser({ Username: email, Pool: pool });
      const authDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });

      return new Promise<void>((resolve, reject) => {
        cognitoUser.authenticateUser(authDetails, {
          onSuccess: (session) => {
            const token = session.getIdToken().getJwtToken();
            setTokenGetter(() => getToken());
            setAuthenticated(true);
            fetchMe(token);
            resolve();
          },
          onFailure: (err) => {
            setError(err.message || "Login failed");
            reject(err);
          },
          newPasswordRequired: (userAttributes) => {
            // Cognito requires password change on first login
            setPendingCognitoUser(cognitoUser);
            setPendingUserAttributes(userAttributes);
            setNeedsNewPassword(true);
            resolve();
          },
        });
      });
    },
    [cognitoConfig, getToken]
  );

  const completeNewPassword = useCallback(
    async (newPassword: string, name?: string) => {
      if (!pendingCognitoUser) throw new Error("No pending password challenge");
      setError(null);
      const requiredAttrs: Record<string, string> = {};
      if (name) requiredAttrs.name = name;
      return new Promise<void>((resolve, reject) => {
        pendingCognitoUser.completeNewPasswordChallenge(newPassword, requiredAttrs, {
          onSuccess: (session) => {
            const token = session.getIdToken().getJwtToken();
            setTokenGetter(() => getToken());
            setAuthenticated(true);
            setNeedsNewPassword(false);
            setPendingCognitoUser(null);
            setPendingUserAttributes(null);
            fetchMe(token);
            resolve();
          },
          onFailure: (err) => {
            setError(err.message || "Password change failed");
            reject(err);
          },
        });
      });
    },
    [pendingCognitoUser, getToken]
  );

  const logout = useCallback(async () => {
    if (!cognitoConfig) return;
    const pool = getUserPool(cognitoConfig.userPoolId, cognitoConfig.clientId);
    const currentUser = pool.getCurrentUser();
    if (currentUser) currentUser.signOut();
    setAuthenticated(false);
    setUserInfo({ user: null, isSuperadmin: false });
  }, [cognitoConfig]);

  const loading = configLoading || sessionLoading;

  if (configLoading) return null;

  if (!cognitoConfig) {
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
      "Cognito not configured. Set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID on the backend."
    );
  }

  return createElement(
    AuthContext.Provider,
    {
      value: {
        authenticated,
        loading,
        isSuperadmin: userInfo.isSuperadmin,
        user: userInfo.user,
        login,
        logout,
        needsNewPassword,
        completeNewPassword,
        error,
      },
    },
    children
  );
}
