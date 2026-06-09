import { describe, expect, it } from "vitest";
import { pickAlgorithmGOTW } from "@/lib/editorial";
import type { Game, Team } from "@/lib/types";

function team(id: string, rank: number | null): Team {
  return {
    id,
    name: id,
    mascot: null,
    city: null,
    classification: "7A",
    district: null,
    logoUrl: null,
    colors: { primary: null, secondary: null },
    season: "2025-26",
    record: { wins: 5, losses: 0 },
    rankings: { stateOverall: rank, stateClass: null, national: null },
    stats: {
      pointsFor: 0,
      pointsAgainst: 0,
      yardsFor: 0,
      yardsAgainst: 0,
      passYdsFor: 0,
      rushYdsFor: 0,
      passYdsAgainst: 0,
      rushYdsAgainst: 0,
      turnoversForced: 0,
      turnoversLost: 0,
    },
    headCoach: null,
    maxprepsUrl: null,
  };
}

function game(
  id: string,
  home: string,
  away: string,
  status: "final" | "scheduled" = "scheduled"
): Game {
  return {
    id,
    season: "2025-26",
    week: 0,
    date: "2025-09-12",
    homeTeamId: home,
    awayTeamId: away,
    homeScore: null,
    awayScore: null,
    quarterScores: { home: [], away: [] },
    status,
    dataStatus: "missing",
    venue: null,
    boxScore: null,
    maxprepsUrl: null,
  };
}

describe("pickAlgorithmGOTW", () => {
  it("prefers games between two ranked teams over one ranked + unranked", () => {
    const teams = [team("a", 1), team("b", 2), team("c", null)];
    const games = [game("g1", "a", "c"), game("g2", "a", "b")];
    const pick = pickAlgorithmGOTW(games, teams);
    expect(pick?.id).toBe("g2");
  });

  it("returns null when no scheduled games", () => {
    const teams = [team("a", 1), team("b", 2)];
    const games = [game("g1", "a", "b", "final")];
    expect(pickAlgorithmGOTW(games, teams)).toBeNull();
  });
});
