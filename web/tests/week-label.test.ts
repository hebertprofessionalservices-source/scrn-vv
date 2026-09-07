import { describe, expect, it } from "vitest";
import {
  weekLabel,
  weekLabelParts,
  weekOptionsFor,
  type WeekOption,
} from "@/lib/schedule-filter";

// Sep 7 2026 week: MHSAA calls it Week 3, MAIS calls it Week 4.
const sep7: WeekOption = { key: "2026-09-07", mais: 4, mhsaa: 3 };
// Aug 10 week: MAIS Week 0, MHSAA has not started.
const aug10: WeekOption = { key: "2026-08-10", mais: 0, mhsaa: null };
const aug17: WeekOption = { key: "2026-08-17", mais: 1, mhsaa: null };

describe("weekLabelParts", () => {
  it("always names the league, one line each", () => {
    expect(weekLabelParts(sep7, "")).toEqual(["MHSAA Week 3", "MAIS Week 4"]);
  });

  it("shows only the filtered league", () => {
    expect(weekLabelParts(sep7, "MAIS")).toEqual(["MAIS Week 4"]);
    expect(weekLabelParts(sep7, "MHSAA")).toEqual(["MHSAA Week 3"]);
  });

  it("omits a league that is not playing that week", () => {
    expect(weekLabelParts(aug10, "")).toEqual(["MAIS Week 0"]);
    expect(weekLabelParts(aug10, "MHSAA")).toEqual([]);
  });
});

describe("weekLabel — single line, for a select option", () => {
  it("joins the leagues with a slash", () => {
    expect(weekLabel(sep7, "")).toBe("MHSAA Week 3 / MAIS Week 4");
  });

  it("drops to one league when filtered", () => {
    expect(weekLabel(sep7, "MAIS")).toBe("MAIS Week 4");
  });

  it("falls back when neither league plays", () => {
    expect(weekLabel({ key: "x", mais: null, mhsaa: null }, "")).toBe("Off week");
  });
});

describe("weekOptionsFor", () => {
  const weeks = [aug10, aug17, sep7];

  it("offers every week when no league is filtered", () => {
    expect(weekOptionsFor(weeks, "", 2).map((o) => o.index)).toEqual([0, 1, 2]);
  });

  it("hides weeks the filtered league does not play", () => {
    // MHSAA has no mid-August games; offering them guarantees an empty page.
    expect(weekOptionsFor(weeks, "MHSAA", 2).map((o) => o.index)).toEqual([2]);
  });

  it("keeps the current week even if the league is off, so the select has a value", () => {
    expect(weekOptionsFor(weeks, "MHSAA", 0).map((o) => o.index)).toEqual([0, 2]);
  });

  it("preserves original indices so week links stay correct", () => {
    expect(weekOptionsFor(weeks, "MAIS", 0).map((o) => o.week.key)).toEqual([
      "2026-08-10",
      "2026-08-17",
      "2026-09-07",
    ]);
  });
});
