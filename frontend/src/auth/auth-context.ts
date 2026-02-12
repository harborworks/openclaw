import { createContext } from "react";
import type { SignInOutput } from "aws-amplify/auth";

export interface User {
  userId: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<SignInOutput>;
  register: (email: string, password: string) => Promise<void>;
  confirmRegistration: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  getIdToken: () => Promise<string | undefined>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
