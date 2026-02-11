import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  getCurrentUser,
  fetchAuthSession,
  type SignInOutput,
} from "aws-amplify/auth";

interface User {
  userId: string;
  email: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<SignInOutput>;
  register: (email: string, password: string) => Promise<void>;
  confirmRegistration: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | undefined>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  const resolveUser = useCallback(async (): Promise<User | null> => {
    try {
      const { userId, signInDetails } = await getCurrentUser();
      const session = await fetchAuthSession();
      const email =
        signInDetails?.loginId ??
        session.tokens?.idToken?.payload?.email?.toString() ??
        "";
      return { userId, email };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    resolveUser().then((user) => setState({ user, loading: false }));
  }, [resolveUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await signIn({ username: email, password });
      if (result.isSignedIn) {
        const user = await resolveUser();
        setState({ user, loading: false });
      }
      return result;
    },
    [resolveUser],
  );

  const register = useCallback(async (email: string, password: string) => {
    await signUp({
      username: email,
      password,
      options: { userAttributes: { email } },
    });
  }, []);

  const confirmRegistration = useCallback(
    async (email: string, code: string) => {
      await confirmSignUp({ username: email, confirmationCode: code });
    },
    [],
  );

  const logout = useCallback(async () => {
    await signOut();
    setState({ user: null, loading: false });
  }, []);

  const getIdToken = useCallback(async () => {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString();
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, confirmRegistration, logout, getIdToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
