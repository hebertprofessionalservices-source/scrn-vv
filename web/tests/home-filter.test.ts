import { describe, expect, it } from "vitest";
import { anyInScope, classInScope, inScope, scopeSuffix } from "@/lib/home-filter";
import { buildScoreCards } from "@/lib/scores";
import type { Game, Team } from "@/lib/types";

describe("classInScope", () => {
  it("passes everything when nothing is selected", () => {
    expect(classInScope("7A", "", "")).toBe(true);
    expect(classInScope("MAIS-3A", "", "")).toBe(true);
  });

  it("splits the two leagues", () => {
    expect(classInScope("7A", "MHSAA", "")).toBe(true);
    expect(classInScope("7A", "MAIS", "")).toBe(false);
    expect(classInScope("MAIS-3A", "MAIS", "")).toBe(true);
    expect(classInScope("MAIS-8M-1A", "MAIS", "")).toBe(true);
    expect(classInScope("MAIS-3A", "MHSAA", "")).toBe(false);
  });

  it("narrows to a single classification", () => {
    expect(classInScope("MAIS-3A", "MAIS", "MAIS-3A")).toBe(true);
    expect(classInScope("MAIS-4A", "MAIS", "MAIS-3A")).toBe(false);
    // MAIS 3A and MHSAA 3A are different classifications, not the same one.
    expect(classInScope("3A", "", "MAIS-3A")).toBe(false);
  });
});

describe("inScope", () => {
  it("reads the classification off the entry", () => {
    const line = { classification: "MAIS-3A", name: "A Player" };
    expect(inScope(line, "MAIS", "")).toBe(true);
    expect(inScope(line, "MHSAA", "")).toBe(false);
  });
});

describe("anyInScope", () => {
  it("matches a game from either side", () => {
    expect(anyInScope(["3A", "1A"], "", "1A")).toBe(true);
    expect(anyInScope(["3A", "1A"], "", "3A")).toBe(true);
    expect(anyInScope(["3A", "1A"], "", "2A")).toBe(false);
  });

  it("keeps a cross-league game under either league", () => {
    expect(anyInScope(["MAIS-4A", "4A"], "MAIS", "")).toBe(true);
    expect(anyInScope(["MAIS-4A", "4A"], "MHSAA", "")).toBe(true);
  });
});

describe("scopeSuffix", () => {
  it("is empty when unfiltered", () => {
    expect(scopeSuffix("", "")).toBe("");
  });

  it("labels the active filter", () => {
    expect(scopeSuffix("MAIS", "")).toBe(" (MAIS)");
    expect(scopeSuffix("MAIS", "MAIS-3A")).toBe(" (MAIS · MAIS 3A)");
    expect(scopeSuffix("", "7A")).toBe(" (7A)");
  });
});

function team(id: string, name: string, classification: string): Team {
  return {
    id, name, classification, season: "2026-27",
    mascot: null, city: null, district: null, logoUrl: null,
    record: { wins: 0, losses: 0 },
  } as unknown as Team;
}

function game(id: string, home: string, away: string, hs: number, as: number): Game {
  return {
    id, season: "2026-27", week: 0, date: "2026-08-28",
    homeTeamId: home, awayTeamId: away, homeScore: hs, awayScore: as,
    status: "final",
  } as unknown as Game;
}

describe("buildScoreCards", () => {
  const teams = [
    team("winston", "Winston Academy", "MAIS-3A"),
    team("carroll", "Carroll Academy", "MAIS-2A"),
    team("tupelo", "Tupelo", "7A"),
  ];
  const teamsById = new Map(teams.map((t) => [t.id, t]));

  it("carries both sides' classifications so either can match", () => {
    const [card] = buildScoreCards([game("g1", "winston", "carroll", 21, 14)], teamsById);
    expect(card.classifications).toEqual(["MAIS-3A", "MAIS-2A"]);
    expect(anyInScope(card.classifications, "MAIS", "MAIS-2A")).toBe(true);
    expect(anyInScope(card.classifications, "MHSAA", "")).toBe(false);
  });

  it("flattens names, scores and the winner", () => {
    const [card] = buildScoreCards([game("g2", "tupelo", "winston", 10, 31)], teamsById);
    expect(card.homeName).toBe("Tupelo");
    expect(card.awayName).toBe("Winston Academy");
    expect(card.awayWin).toBe(true);
    expect(card.href).toContain("/matchup/");
  });

  it("survives a team it can't resolve", () => {
    const [card] = buildScoreCards([game("g3", "tupelo", "unknown-team", 42, 0)], teamsById);
    expect(card.awayName).toBe("Unknown Team");
    expect(card.href).toBeNull();
    expect(card.classifications).toEqual(["7A"]);
  });
});
