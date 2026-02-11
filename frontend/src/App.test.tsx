import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock Amplify before importing App
vi.mock("aws-amplify/auth", () => ({
  getCurrentUser: vi.fn().mockRejectedValue(new Error("not signed in")),
  fetchAuthSession: vi.fn().mockResolvedValue({ tokens: null }),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  confirmSignUp: vi.fn(),
}));

vi.mock("aws-amplify", () => ({
  Amplify: { configure: vi.fn() },
}));

import App from "./App";

describe("App", () => {
  it("redirects unauthenticated users to login", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });
});
