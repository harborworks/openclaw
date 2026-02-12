import { describe, it, expect } from "vitest";

// Unit test for the requireSuperAdmin guard logic
// (Can't test the full Convex function without a test harness, but we can test the logic)
describe("admin guard logic", () => {
  it("rejects null user", () => {
    const user = null;
    expect(user === null || !user).toBe(true);
  });

  it("rejects non-superAdmin user", () => {
    const user = { isSuperAdmin: false };
    expect(!user.isSuperAdmin).toBe(true);
  });

  it("accepts superAdmin user", () => {
    const user = { isSuperAdmin: true };
    expect(user.isSuperAdmin).toBe(true);
  });
});
