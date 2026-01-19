import { describe, expect, it, vi } from "vitest";

// Mock config before importing app
vi.mock("./config", () => ({
  default: {
    port: 3000,
    nodeEnv: "test",
    userPoolId: "test-pool",
    clientId: "test-client",
    cognitoRegion: "us-east-1",
    databaseHost: "localhost",
    databaseName: "test",
    databasePort: 5432,
    databaseUser: "test",
    databasePassword: "test",
  },
}));

// Mock the database to avoid connection
vi.mock("./db", () => ({
  db: {},
}));

// Mock the middlewares to avoid JWT verification in tests
vi.mock("./middlewares", () => ({
  authMiddleware: (_req: any, _res: any, next: any) => next(),
  requireSuperadmin: (_req: any, _res: any, next: any) => next(),
  errorHandler: (err: any, _req: any, res: any, _next: any) => {
    res.status(500).json({ error: err.message });
  },
}));

// Import app after mocking
import app from "./app";

describe("Express App", () => {
  it("is defined", () => {
    expect(app).toBeDefined();
  });

  it("is an express application", () => {
    // Express apps have these methods
    expect(typeof app.use).toBe("function");
    expect(typeof app.get).toBe("function");
    expect(typeof app.post).toBe("function");
  });
});
