import express from "express";
import { describe, expect, it } from "vitest";
import helloRoutes from "./helloRoutes";

describe("Hello Routes", () => {
  it("exports a router", () => {
    expect(helloRoutes).toBeDefined();
  });

  it("can be mounted on an express app", () => {
    const app = express();
    expect(() => app.use("/", helloRoutes)).not.toThrow();
  });
});
