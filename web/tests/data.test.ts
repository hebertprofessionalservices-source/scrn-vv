import { describe, expect, it } from "vitest";
import { buildDataset } from "@/lib/data";
import type { Team, Player, Game } from "@/lib/types";

const team: Team = {
  id: "x-team-team", name: "X", mascot: "Team", city: null,
  classification: "7A", district: null, logoUrl: null,
  colors: { primary: null, secondary: null }, season: "2025-26",
  record: { wins: 5, losses: 5 },
  rankings: { stateOverall: null, stateClass: null, national: null },
  stats: { pointsFor: 200, pointsAgainst: 150, yardsFor: 0, yardsAgainst: 0,
    passYdsFor: 0, rushYdsFor: 0, passYdsAgainst: 0, rushYdsAgainst: 0,
    turnoversForced: 0, turnoversLost: 0 },
  headCoach: null, maxprepsUrl: null,
};
const player: Player = {
  id: "x-team-team-12-doe", teamId: "x-team-team", season: "2025-26",
  name: "Jane Doe", jersey: "12", position: "QB", class: "SR",
  height: null, weight: null, gamesPlayed: 10,
  stats: {
    passing: { att: 100, cmp: 65, yds: 1500, td: 20, int: 5, rating: 100 },
    rushing: { att: 0, yds: 0, td: 0, ypc: 0 },
    receiving: { rec: 0, yds: 0, td: 0 },
    defense: { tackles: 0, sacks: 0, int: 0, ff: 0 },
    kicking: { fgm: 0, fga: 0, xpm: 0, xpa: 0 },
  },
};
const game: Game = {
  id: "g1", season: "2025-26", week: 0, date: "2025-09-12",
  homeTeamId: "x-team-team", awayTeamId: "y-team-team",
  homeScore: 21, awayScore: 14,
  quarterScores: { home: [7, 7, 0, 7], away: [0, 7, 0, 7] },
  status: "final", dataStatus: "complete", venue: null,
  boxScore: { passing: [], rushing: [], receiving: [], defense: [] },
  maxprepsUrl: null,
};

describe("buildDataset", () => {
  it("indexes teams by id and displaySlug", () => {
    const d = buildDataset({ teams: [team], players: [], games: [] });
    expect(d.teamsById.get("x-team-team")?.name).toBe("X");
    expect(d.teamsBySlug.get("x-team")?.name).toBe("X");
  });

  it("indexes players by teamId and id", () => {
    const d = buildDataset({ teams: [team], players: [player], games: [] });
    expect(d.playersByTeam.get("x-team-team")?.length).toBe(1);
    expect(d.playersById.get(player.id)?.name).toBe("Jane Doe");
  });

  it("indexes games by teamId both sides", () => {
    const d = buildDataset({ teams: [team], players: [], games: [game] });
    expect(d.gamesByTeam.get("x-team-team")?.length).toBe(1);
    expect(d.gamesByTeam.get("y-team-team")?.length).toBe(1);
  });
});
