import { describe, expect, it } from "vitest";
import { displaySlug } from "@/lib/display-slug";

describe("displaySlug", () => {
  it("strips duplicated mascot suffix", () => {
    expect(displaySlug({ name: "Ashland Blue Devils", mascot: "Blue Devils" }))
      .toBe("ashland-blue-devils");
  });
  it("keeps mascot when it adds information", () => {
    expect(displaySlug({ name: "Starkville", mascot: "Yellowjackets" }))
      .toBe("starkville-yellowjackets");
  });
  it("handles missing mascot", () => {
    expect(displaySlug({ name: "Tupelo", mascot: null }))
      .toBe("tupelo");
  });
  it("strips apostrophes and punctuation", () => {
    expect(displaySlug({ name: "D'Iberville", mascot: "Warriors" }))
      .toBe("diberville-warriors");
  });
});
