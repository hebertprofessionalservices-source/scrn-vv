import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "@/lib/auth";

const secret = "test-secret-do-not-use-in-prod-aaaaaaaaaaaa";

describe("auth cookie tokens", () => {
  it("round-trips a payload", async () => {
    const token = await signToken({ scope: "site" }, secret);
    const decoded = await verifyToken(token, secret);
    expect(decoded?.scope).toBe("site");
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signToken({ scope: "site" }, secret);
    const decoded = await verifyToken(token, "other-secret-other-secret-other");
    expect(decoded).toBeNull();
  });

  it("rejects a tampered token", async () => {
    const token = await signToken({ scope: "site" }, secret);
    const tampered = token.slice(0, -2) + "xx";
    expect(await verifyToken(tampered, secret)).toBeNull();
  });
});
