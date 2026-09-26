import { describe, expect, it } from "vitest";
import { resultFor, winnerSide } from "@/lib/result";
import type { Game } from "@/lib/types";

const game = (homeScore: number | null, awayScore: number | null, forfeit?: "home" | "away"): Game => ({
  id: "g", season: "2026-27", week: 0, date: "2026-09-25",
  homeTeamId: "h", awayTeamId: "a", homeScore, awayScore,
  quarterScores: { home: [], away: [] }, status: "final", dataStatus: "missing",
  venue: null, boxScore: null, maxprepsUrl: null, forfeit,
});

describe("winnerSide / resultFor", () => {
  it("decides by score", () => {
    expect(winnerSide(game(28, 6))).toBe("home");
    expect(resultFor(game(28, 6), false)).toBe("L");
    expect(winnerSide(game(7, 7))).toBe("tie");
    expect(winnerSide(game(null, null))).toBeNull();
  });

  it("a 0–0 forfeit goes to the named side, not a tie", () => {
    const g = game(0, 0, "away");
    expect(winnerSide(g)).toBe("away");
    expect(resultFor(g, false)).toBe("W");
    expect(resultFor(g, true)).toBe("L");
  });
});
