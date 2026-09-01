import { describe, expect, it } from "vitest";
import { buildDataset } from "@/lib/data";
import { buildPowerRankings } from "@/lib/power";
import { buildPreview, currentWeekRange, previewSides, slateDates } from "@/lib/preview";
import type { Game, Team } from "@/lib/types";

function team(id: string, classification = "1A", district: string | null = "1"): Team {
  return {
    id, name: id, mascot: null, city: null,
    classification: classification as Team["classification"], district,
    logoUrl: null, colors: { primary: null, secondary: null }, season: "2026-27",
    record: { wins: 2, losses: 0 },
    rankings: { stateOverall: null, stateClass: null, national: null },
    stats: {
      pointsFor: 60, pointsAgainst: 20, yardsFor: 0, yardsAgainst: 0,
      passYdsFor: 0, rushYdsFor: 0, passYdsAgainst: 0, rushYdsAgainst: 0,
      turnoversForced: 0, turnoversLost: 0,
    },
    headCoach: null, maxprepsUrl: null,
  };
}

function game(over: Partial<Game> & Pick<Game, "id" | "homeTeamId" | "awayTeamId">): Game {
  return {
    season: "2026-27", week: 1, date: "2026-09-04",
    homeScore: null, awayScore: null,
    quarterScores: { home: [], away: [] }, status: "scheduled", dataStatus: "complete",
    venue: null, boxScore: null, maxprepsUrl: null,
    ...over,
  };
}

describe("currentWeekRange", () => {
  it("spans the Monday-to-Sunday week a date falls in", () => {
    // Tue Sep 1 2026 sits in the Aug 31 – Sep 6 week.
    expect(currentWeekRange("2026-09-01")).toEqual(["2026-08-31", "2026-09-06"]);
    expect(currentWeekRange("2026-08-31")).toEqual(["2026-08-31", "2026-09-06"]);
    expect(currentWeekRange("2026-09-06")).toEqual(["2026-08-31", "2026-09-06"]);
  });
});

describe("slateDates", () => {
  it("keeps only unplayed games inside the window", () => {
    const games = [
      game({ id: "a", homeTeamId: "h", awayTeamId: "v", date: "2026-09-04" }),
      game({ id: "b", homeTeamId: "h", awayTeamId: "v", date: "2026-09-03" }),
      // Outside the window.
      game({ id: "c", homeTeamId: "h", awayTeamId: "v", date: "2026-09-11" }),
      // Already played.
      game({ id: "d", homeTeamId: "h", awayTeamId: "v", date: "2026-09-05", status: "final" }),
    ];
    expect(slateDates(games, ["2026-08-31", "2026-09-06"])).toEqual([
      "2026-09-03",
      "2026-09-04",
    ]);
  });
});

describe("buildPreview", () => {
  const opts = { classification: "1A", dates: ["2026-09-04"] };

  it("leads with the ranked, closely rated, region matchup", () => {
    const teams = [
      team("a"), team("b"),
      team("c"), team("d"),
      team("e", "1A", "9"), team("f", "1A", "9"),
    ];
    // Results that make a/b near-equals and c/d lopsided.
    const played: Game[] = [
      game({ id: "p1", homeTeamId: "a", awayTeamId: "z1", date: "2026-08-28", status: "final", homeScore: 21, awayScore: 20 }),
      game({ id: "p2", homeTeamId: "b", awayTeamId: "z2", date: "2026-08-28", status: "final", homeScore: 22, awayScore: 20 }),
      game({ id: "p3", homeTeamId: "c", awayTeamId: "z3", date: "2026-08-28", status: "final", homeScore: 70, awayScore: 0 }),
      game({ id: "p4", homeTeamId: "d", awayTeamId: "z4", date: "2026-08-28", status: "final", homeScore: 3, awayScore: 60 }),
    ];
    const upcoming: Game[] = [
      game({ id: "u1", homeTeamId: "a", awayTeamId: "b" }),
      game({ id: "u2", homeTeamId: "c", awayTeamId: "d" }),
      game({ id: "u3", homeTeamId: "e", awayTeamId: "f" }),
    ];
    const data = buildDataset({ teams, players: [], games: [...played, ...upcoming] });
    const p = buildPreview(data, buildPowerRankings(data), null, opts);

    expect(p.fixtures).toHaveLength(3);
    expect(p.headliners).toHaveLength(3);
    // a vs b: both ranked, ratings a hair apart, same region.
    expect(p.headliners[0].game.id).toBe("u1");
  });

  it("deduplicates the paired rows games.json stores", () => {
    const teams = [team("a"), team("b")];
    const games = [
      game({ id: "u1", homeTeamId: "a", awayTeamId: "b", maxprepsUrl: "http://x/1" }),
      game({ id: "u1-dup", homeTeamId: "a", awayTeamId: "b", maxprepsUrl: "http://x/1" }),
    ];
    const data = buildDataset({ teams, players: [], games });
    const p = buildPreview(data, buildPowerRankings(data), null, opts);
    expect(p.fixtures).toHaveLength(1);
  });

  it("drops games where neither side is in the page's class", () => {
    const teams = [team("a", "2A"), team("b", "2A")];
    const games = [game({ id: "u1", homeTeamId: "a", awayTeamId: "b" })];
    const data = buildDataset({ teams, players: [], games });
    const p = buildPreview(data, buildPowerRankings(data), null, opts);
    expect(p.fixtures).toHaveLength(0);
  });

  it("never reports a score for an unplayed game", () => {
    const teams = [team("a"), team("b")];
    const games = [game({ id: "u1", homeTeamId: "a", awayTeamId: "b" })];
    const data = buildDataset({ teams, players: [], games });
    const p = buildPreview(data, buildPowerRankings(data), null, opts);
    expect(p.fixtures[0].game.homeScore).toBeNull();
    expect(p.fixtures[0].homeRecord).toBe("2–0");
    expect(p.fixtures[0].day).toBe("Fri");
  });
});

describe("previewSides", () => {
  it("leads with the in-class team on a cross-class game", () => {
    const teams = [team("a", "1A"), team("b", "2A")];
    const games = [game({ id: "u1", homeTeamId: "b", awayTeamId: "a" })];
    const data = buildDataset({ teams, players: [], games });
    const p = buildPreview(data, buildPowerRankings(data), null, {
      classification: "1A", dates: ["2026-09-04"],
    });
    // Home is the 2A side, so the 1A visitor must lead the row.
    expect(previewSides(p.fixtures[0]).lead.school).toBe("a");
  });
});
