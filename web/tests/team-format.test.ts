import { describe, expect, it } from "vitest";
import { opponentAliasSlug, titleCaseSlug } from "@/lib/team-format";

describe("titleCaseSlug", () => {
  it("title-cases an ordinary opponent slug", () => {
    expect(titleCaseSlug("brother-martin")).toBe("Brother Martin");
  });

  it("surfaces a trailing state code for out-of-state namesakes", () => {
    // The scraper tags these so they stop resolving onto the Mississippi
    // school of the same name (DeSoto Central plays Germantown, TN).
    expect(titleCaseSlug("germantown-tn")).toBe("Germantown (TN)");
    expect(titleCaseSlug("columbia-academy-tn")).toBe("Columbia Academy (TN)");
  });

  it("leaves a two-letter word alone when it is not a state code", () => {
    expect(titleCaseSlug("st-xy")).toBe("St Xy");
  });

  it("does not strip a lone segment", () => {
    expect(titleCaseSlug("ms")).toBe("Ms");
  });
});

describe("opponentAliasSlug", () => {
  it("drops the mascot so schedule slugs resolve back to a team", () => {
    expect(opponentAliasSlug({ name: "Pearl Pirates", mascot: "Pirates" })).toBe("pearl");
  });

  it("keeps the name when it does not end in the mascot", () => {
    expect(opponentAliasSlug({ name: "Discovery Christian", mascot: null })).toBe(
      "discovery-christian",
    );
  });
});
