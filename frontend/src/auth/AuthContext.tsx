import { useEffect, useState, useCallback, type ReactNode } from "react";
import {
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  getCurrentUser,
  fetchAuthSession,
} from "aws-amplify/auth";
import { AuthContext, type User, type AuthState } from "./auth-context";

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
      // Clear any existing session to avoid "already signed in" error
      try { await signOut(); } catch { /* ignore */ }
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

  const refresh = useCallback(async () => {
    const user = await resolveUser();
    setState({ user, loading: false });
  }, [resolveUser]);

  const getIdToken = useCallback(async () => {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString();
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, confirmRegistration, logout, refresh, getIdToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}
