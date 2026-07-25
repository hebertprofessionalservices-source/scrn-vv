import { describe, expect, it } from "vitest";
import { computeRankDeltas, mondayOf, type RankHistory } from "@/lib/rank-history";
import type { PowerRank } from "@/lib/power";

const rank = (o: number, c: number): PowerRank => ({
  rating: 0, overallRank: o, classRank: c, source: "current",
});

describe("computeRankDeltas", () => {
  const power = new Map<string, PowerRank>([
    ["up", rank(2, 1)],
    ["down", rank(5, 3)],
    ["flat", rank(9, 4)],
    ["new", rank(11, 5)],
  ]);

  it("compares against the newest snapshot from an earlier week", () => {
    const history: RankHistory = {
      // two weeks ago — superseded by last week's entry
      "2026-08-14": { up: { o: 20, c: 9 }, down: { o: 1, c: 1 }, flat: { o: 9, c: 4 } },
      // last week — the baseline
      "2026-08-21": { up: { o: 6, c: 3 }, down: { o: 2, c: 1 }, flat: { o: 9, c: 4 } },
    };
    const deltas = computeRankDeltas(power, history, "2026-08-26");
    expect(deltas.get("up")).toEqual({ overall: 4, class: 2 });     // moved up
    expect(deltas.get("down")).toEqual({ overall: -3, class: -2 }); // moved down
    expect(deltas.get("flat")).toEqual({ overall: 0, class: 0 });
    expect(deltas.has("new")).toBe(false); // not in baseline
  });

  it("ignores snapshots taken in the current week", () => {
    const history: RankHistory = {
      "2026-08-25": { up: { o: 30, c: 10 } }, // same week as today
    };
    expect(computeRankDeltas(power, history, "2026-08-26").size).toBe(0);
  });

  it("returns nothing without history", () => {
    expect(computeRankDeltas(power, {}, "2026-08-26").size).toBe(0);
  });
});

describe("mondayOf", () => {
  it("anchors any day to its Monday", () => {
    expect(mondayOf("2026-08-26")).toBe("2026-08-24"); // Wednesday
    expect(mondayOf("2026-08-24")).toBe("2026-08-24"); // Monday
    expect(mondayOf("2026-08-30")).toBe("2026-08-24"); // Sunday
  });
});
