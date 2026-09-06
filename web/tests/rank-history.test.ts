import { describe, expect, it } from "vitest";
import { computeRankDeltas, mondayOf, todayISO, type RankHistory } from "@/lib/rank-history";
import type { PowerRank } from "@/lib/power";

const rank = (o: number, c: number): PowerRank => ({
  rating: 0, overallRank: o, classRank: c,
});

describe("computeRankDeltas", () => {
  const power = new Map<string, PowerRank>([
    ["up", rank(2, 1)],
    ["down", rank(5, 3)],
    ["flat", rank(9, 4)],
    ["new", rank(11, 5)],
  ]);

  it("compares against the newest snapshot from an earlier day", () => {
    const history: RankHistory = {
      // superseded by the more recent entry
      "2026-08-14": { up: { o: 20, c: 9 }, down: { o: 1, c: 1 }, flat: { o: 9, c: 4 } },
      // the baseline
      "2026-08-21": { up: { o: 6, c: 3 }, down: { o: 2, c: 1 }, flat: { o: 9, c: 4 } },
    };
    const deltas = computeRankDeltas(power, history, "2026-08-26");
    expect(deltas.get("up")).toEqual({ overall: 4, class: 2 });     // moved up
    expect(deltas.get("down")).toEqual({ overall: -3, class: -2 }); // moved down
    expect(deltas.get("flat")).toEqual({ overall: 0, class: 0 });
    expect(deltas.has("new")).toBe(false); // not in baseline
  });

  it("uses a pre-slate snapshot from earlier in the same game week", () => {
    // The Sunday recap case: Monday's snapshot precedes Friday's games and
    // must be the baseline, even though it shares Sunday's calendar week.
    const history: RankHistory = {
      "2026-08-16": { up: { o: 30, c: 10 } }, // previous week — too far back
      "2026-08-24": { up: { o: 6, c: 3 } },   // Monday, same week as Sunday 8/30
    };
    const deltas = computeRankDeltas(power, history, "2026-08-30");
    expect(deltas.get("up")).toEqual({ overall: 4, class: 2 });
  });

  it("ignores a snapshot taken today", () => {
    const history: RankHistory = {
      "2026-08-26": { up: { o: 30, c: 10 } }, // today — would be zero vs itself
    };
    expect(computeRankDeltas(power, history, "2026-08-26").size).toBe(0);
  });

  it("ignores snapshots dated after today", () => {
    const history: RankHistory = {
      "2026-09-02": { up: { o: 30, c: 10 } },
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

describe("todayISO", () => {
  it("uses the local date, not UTC", () => {
    // 19:01 Central on Sep 5 is already Sep 6 in UTC. A snapshot taken then
    // was stamped tomorrow, became its own baseline, and zeroed every arrow.
    const evening = new Date(2026, 8, 5, 19, 1, 0);
    expect(todayISO(evening)).toBe("2026-09-05");
    expect(evening.toISOString().slice(0, 10)).not.toBe(todayISO(evening));
  });

  it("pads single-digit months and days", () => {
    expect(todayISO(new Date(2026, 0, 4, 12, 0, 0))).toBe("2026-01-04");
  });
});
