import { describe, it, expect } from "vitest";
import { resolveCode, PAIRING_TTL_MS } from "./pairing.js";
import type { PairingStore, AllowFromStore } from "./pairing.js";

function makePairingStore(requests: PairingStore["requests"]): PairingStore {
  return { version: 1, requests };
}

function makeAllowFromStore(allowFrom: string[] = []): AllowFromStore {
  return { version: 1, allowFrom };
}

const NOW = Date.now();

describe("resolveCode", () => {
  it("approves a valid code and adds sender to allowFrom", () => {
    const pairing = makePairingStore([
      { id: "12345", code: "ABCD1234", createdAt: new Date(NOW - 1000).toISOString(), lastSeenAt: "" },
    ]);
    const allow = makeAllowFromStore();

    const result = resolveCode("ABCD1234", pairing, allow, NOW);

    expect(result).toEqual({ senderId: "12345", meta: undefined });
    expect(pairing.requests).toHaveLength(0);
    expect(allow.allowFrom).toEqual(["12345"]);
  });

  it("is case-insensitive on the code", () => {
    const pairing = makePairingStore([
      { id: "99", code: "XYZW5678", createdAt: new Date(NOW - 1000).toISOString(), lastSeenAt: "" },
    ]);
    const allow = makeAllowFromStore();

    const result = resolveCode("xyzw5678", pairing, allow, NOW);

    expect(result).not.toBeNull();
    expect(result!.senderId).toBe("99");
  });

  it("returns null for a non-existent code", () => {
    const pairing = makePairingStore([
      { id: "12345", code: "ABCD1234", createdAt: new Date(NOW - 1000).toISOString(), lastSeenAt: "" },
    ]);
    const allow = makeAllowFromStore();

    const result = resolveCode("WRONG999", pairing, allow, NOW);

    expect(result).toBeNull();
    expect(pairing.requests).toHaveLength(1); // unchanged
    expect(allow.allowFrom).toHaveLength(0);
  });

  it("returns null for an expired code", () => {
    const pairing = makePairingStore([
      { id: "12345", code: "ABCD1234", createdAt: new Date(NOW - PAIRING_TTL_MS - 1000).toISOString(), lastSeenAt: "" },
    ]);
    const allow = makeAllowFromStore();

    const result = resolveCode("ABCD1234", pairing, allow, NOW);

    expect(result).toBeNull();
  });

  it("does not duplicate sender in allowFrom", () => {
    const pairing = makePairingStore([
      { id: "12345", code: "ABCD1234", createdAt: new Date(NOW - 1000).toISOString(), lastSeenAt: "" },
    ]);
    const allow = makeAllowFromStore(["12345"]);

    const result = resolveCode("ABCD1234", pairing, allow, NOW);

    expect(result).not.toBeNull();
    expect(allow.allowFrom).toEqual(["12345"]); // no duplicate
  });

  it("preserves meta from the pairing request", () => {
    const pairing = makePairingStore([
      {
        id: "12345",
        code: "META1234",
        createdAt: new Date(NOW - 1000).toISOString(),
        lastSeenAt: "",
        meta: { username: "testuser", first_name: "Test" },
      },
    ]);
    const allow = makeAllowFromStore();

    const result = resolveCode("META1234", pairing, allow, NOW);

    expect(result).toEqual({
      senderId: "12345",
      meta: { username: "testuser", first_name: "Test" },
    });
  });

  it("handles empty pairing store", () => {
    const pairing = makePairingStore([]);
    const allow = makeAllowFromStore();

    const result = resolveCode("ANYTHING", pairing, allow, NOW);

    expect(result).toBeNull();
  });
});
