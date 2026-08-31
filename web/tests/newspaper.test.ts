import { describe, expect, it } from "vitest";
import {
  buildNewspaper, latestSlate, leagueOf, leagueWeek, scoreboardSides,
} from "@/lib/newspaper";
import type { Dataset } from "@/lib/data";
import type { PowerRank } from "@/lib/power";
import type { Game, Team } from "@/lib/types";

const DATE = "2026-08-28";

function team(id: string, name: string, classification = "7A"): Team {
  return {
    id, name, mascot: null, city: null, classification, district: null,
    logoUrl: `/team-logos/${id}.png`, season: "2026-27",
    record: { wins: 0, losses: 0 },
    rankings: { stateOverall: null, stateClass: null, national: null },
    stats: {} as Team["stats"], headCoach: null, maxprepsUrl: null,
  } as unknown as Team;
}

function game(
  id: string, home: string, away: string, hs: number, as: number,
  extra: Partial<Game> = {},
): Game {
  return {
    id, season: "2026-27", week: 0, date: DATE,
    homeTeamId: home, awayTeamId: away, homeScore: hs, awayScore: as,
    quarterScores: { home: [], away: [] },
    status: "final", dataStatus: "missing", venue: null, boxScore: null,
    maxprepsUrl: `https://maxpreps/?c=${id}`,
    ...extra,
  } as unknown as Game;
}

/** roster: teamId -> full player names, used to attribute box score lines. */
function dataset(
  teams: Team[],
  games: Game[],
  roster: Record<string, string[]> = {},
  opponentLogos: Record<string, string> = {},
): Dataset {
  const byId = new Map(teams.map((t) => [t.id, t]));
  const playersByTeam = new Map(
    Object.entries(roster).map(([teamId, names]) => [
      teamId,
      names.map((name) => ({ id: name, teamId, name })),
    ]),
  );
  return {
    teams, players: [], games,
    teamsById: byId, teamsBySlug: byId, teamsByAlias: byId,
    playersById: new Map(), playersByTeam,
    gamesByTeam: new Map(), gamesById: new Map(),
    opponentLogos: new Map(Object.entries(opponentLogos)), season: "2026-27",
    priorRatings: null, priorStateRanks: null,
  } as unknown as Dataset;
}

function ranks(entries: [string, number][]): Map<string, PowerRank> {
  return new Map(
    entries.map(([id, c]) => [
      id, { rating: 0, overallRank: c, classRank: c, source: "current" } as PowerRank,
    ]),
  );
}

const opts = { classification: "7A", dates: [DATE] };

describe("buildNewspaper", () => {
  it("collapses the paired rows games.json stores for one contest", () => {
    const teams = [team("alpha", "Alpha"), team("beta", "Beta")];
    // One contest, stored twice from each team's schedule scrape. Both rows
    // carry the same MaxPreps contest URL, which is what identifies them.
    const games = [
      game("alpha-at-beta", "beta", "alpha", 14, 21),
      { ...game("beta-hosts-alpha", "beta", "alpha", 14, 21),
        maxprepsUrl: "https://maxpreps/?c=alpha-at-beta" },
    ];
    const paper = buildNewspaper(dataset(teams, games), ranks([]), opts);
    expect(paper.contests).toHaveLength(1);
  });

  it("falls back to date plus teams when a row has no contest URL", () => {
    const teams = [team("alpha", "Alpha"), team("beta", "Beta")];
    const games = [
      game("a", "beta", "alpha", 14, 21, { maxprepsUrl: null }),
      game("b", "beta", "alpha", 14, 21, { maxprepsUrl: null }),
    ];
    const paper = buildNewspaper(dataset(teams, games), ranks([]), opts);
    expect(paper.contests).toHaveLength(1);
  });

  it("names an opponent that is missing from teams.json", () => {
    const teams = [team("alpha", "Alpha")];
    const games = [game("x", "alpha", "north-sunflower-academy", 30, 7)];
    const paper = buildNewspaper(dataset(teams, games), ranks([]), opts);
    expect(paper.contests[0].awayName).toBe("North Sunflower Academy");
  });

  it("leads with a ranked upset over a close game between neighbours", () => {
    const teams = [
      team("top", "Top"), team("low", "Low"),
      team("mid", "Mid"), team("near", "Near"),
    ];
    const games = [
      game("upset", "top", "low", 9, 47),      // No. 20 routs No. 2
      game("close", "mid", "near", 21, 20),    // No. 8 edges No. 9
    ];
    const r = ranks([["top", 2], ["low", 20], ["mid", 8], ["near", 9]]);
    const paper = buildNewspaper(dataset(teams, games), r, opts);
    expect(paper.headliners[0].game.id).toBe("upset");
  });

  it("orders the scoreboard by class rank, not by news value", () => {
    const teams = [
      team("one", "One"), team("nobody", "Nobody"),
      team("five", "Five"), team("six", "Six"),
    ];
    const games = [
      game("blowout", "five", "six", 40, 38),
      game("routine", "one", "nobody", 35, 0),
    ];
    const r = ranks([["one", 1], ["five", 5], ["six", 6]]);
    const paper = buildNewspaper(dataset(teams, games), r, opts);
    expect(paper.scoreboard[0].game.id).toBe("routine");
  });

  it("excludes games from other classifications and other dates", () => {
    const teams = [
      team("a", "A"), team("b", "B"),
      team("c", "C", "5A"), team("d", "D", "5A"),
    ];
    const games = [
      game("keep", "a", "b", 14, 7),
      game("wrongclass", "c", "d", 14, 7),
      game("wrongdate", "a", "b", 14, 7, { date: "2026-09-04", maxprepsUrl: "https://m/?c=wd" }),
    ];
    const paper = buildNewspaper(dataset(teams, games), ranks([]), opts);
    expect(paper.contests.map((c) => c.game.id)).toEqual(["keep"]);
  });

  it("flags overtime from a line score with more than four periods", () => {
    const teams = [team("a", "A"), team("b", "B")];
    const games = [
      game("ot", "a", "b", 23, 16, {
        quarterScores: { home: [7, 0, 3, 6, 7], away: [3, 7, 0, 6, 0] },
      }),
    ];
    const paper = buildNewspaper(dataset(teams, games), ranks([]), opts);
    expect(paper.contests[0].overtime).toBe(true);
    expect(paper.notebook.some((n) => n.label === "OVERTIME")).toBe(true);
  });

  it("ranks stat lines and keeps the scraper's class suffix", () => {
    const teams = [team("a", "A"), team("b", "B")];
    const games = [
      game("g", "a", "b", 34, 24, {
        boxScore: {
          passing: [{ playerId: "B. Santibanez(Sr)", yds: 326, td: 3 }],
          rushing: [{ playerId: "J. Ruffin(Jr)", yds: 113, td: 2 }],
          receiving: [{ playerId: "Tiny(So)", yds: 12, td: 0 }],
          defense: [],
        },
      } as unknown as Partial<Game>),
    ];
    const roster = { a: ["Bryce Santibanez", "Jaylen Ruffin"], b: ["Tim Tiny"] };
    const paper = buildNewspaper(dataset(teams, games, roster), ranks([]), opts);
    expect(paper.performances[0].name).toBe("B. Santibanez (SR)");
    expect(paper.performances[0].line).toBe("326 PASS YDS, 3 TD");
    expect(paper.performances[0].teamName).toBe("A");
    // Below both the yardage and touchdown floors — not a headline performance.
    expect(paper.performances.some((p) => p.name.startsWith("Tiny"))).toBe(false);
  });

  it("never prints an out-of-class team's rank as if it were this class's", () => {
    // Hattiesburg is 6A; its "No. 2" is a 6A rank and would read as 7A here.
    const teams = [team("petal", "Petal", "7A"), team("hburg", "Hattiesburg", "6A")];
    const games = [game("g", "hburg", "petal", 34, 35)];
    const r = ranks([["petal", 7], ["hburg", 2]]);
    const paper = buildNewspaper(dataset(teams, games), r, opts);
    const c = paper.contests[0];
    expect(c.winnerRank).toBe(7);   // Petal, in class
    expect(c.loserRank).toBeNull(); // Hattiesburg, out of class
  });

  it("orders the scoreboard on in-class ranks only", () => {
    const teams = [
      team("sixA", "Six A", "6A"), team("weak", "Weak", "7A"),
      team("best", "Best", "7A"), team("other", "Other", "7A"),
    ];
    const games = [
      game("cross", "sixA", "weak", 40, 0),
      game("inclass", "best", "other", 20, 10),
    ];
    // The 6A team ranks 1 overall but must not lead a 7A scoreboard.
    const r = ranks([["sixA", 1], ["weak", 25], ["best", 3], ["other", 9]]);
    const paper = buildNewspaper(dataset(teams, games), r, opts);
    expect(paper.scoreboard[0].game.id).toBe("inclass");
  });

  it("drops stat lines it cannot attribute to an in-class roster", () => {
    const teams = [team("a", "A", "7A"), team("b", "B", "5A")];
    const games = [
      game("g", "a", "b", 30, 7, {
        boxScore: {
          passing: [{ playerId: "U. Known(Sr)", yds: 300, td: 3 }],
          rushing: [], receiving: [], defense: [],
        },
      } as unknown as Partial<Game>),
    ];
    // No rosters are loaded, so nothing can be matched and nothing is claimed.
    const paper = buildNewspaper(dataset(teams, games), ranks([]), opts);
    expect(paper.performances).toHaveLength(0);
  });

  it("uses the opponent logo registry for schools outside teams.json", () => {
    // Collierville is a Tennessee school: absent from teams.json, but it has a
    // crest registered under its schedule slug and must not render blank.
    const teams = [team("oxford", "Oxford")];
    const games = [game("g", "oxford", "collierville", 34, 24)];
    const logos = { collierville: "/team-logos/collierville.png" };
    const paper = buildNewspaper(dataset(teams, games, {}, logos), ranks([]), opts);
    const c = paper.contests[0];
    expect(c.winnerLogo).toBe("/team-logos/oxford.png");
    expect(c.loserLogo).toBe("/team-logos/collierville.png");
  });

  it("leaves a crest null when nothing knows the opponent", () => {
    const teams = [team("oxford", "Oxford")];
    const games = [game("g", "oxford", "who-knows", 34, 24)];
    const paper = buildNewspaper(dataset(teams, games), ranks([]), opts);
    expect(paper.contests[0].loserLogo).toBeNull();
  });

  it("ignores games that never got a final score", () => {
    const teams = [team("a", "A"), team("b", "B")];
    const games = [game("g", "a", "b", null as unknown as number, null as unknown as number)];
    const paper = buildNewspaper(dataset(teams, games), ranks([]), opts);
    expect(paper.contests).toHaveLength(0);
  });
});

describe("scoreboardSides", () => {
  it("leads with this class's team even when it lost the game", () => {
    // 7A Petal beat 6A Hattiesburg 35-34. On the 6A page, a row led by Petal
    // reads as if Petal were 6A's No. 2.
    const teams = [team("petal", "Petal", "7A"), team("hburg", "Hattiesburg", "6A")];
    const games = [game("g", "hburg", "petal", 34, 35)];
    const r = ranks([["petal", 7], ["hburg", 2]]);
    const paper = buildNewspaper(dataset(teams, games), r, {
      classification: "6A", dates: [DATE],
    });
    const { lead, foe, leadWon } = scoreboardSides(paper.contests[0]);
    expect(lead.school).toBe("Hattiesburg");
    expect(lead.rank).toBe(2);
    expect(lead.score).toBe(34);
    expect(foe.school).toBe("Petal");
    expect(foe.rank).toBeNull(); // out of class: its 7A rank must not print
    expect(foe.score).toBe(35);
    expect(leadWon).toBe(false);
  });

  it("leads with the winner when both sides are in class", () => {
    const teams = [team("a", "Callaway", "6A"), team("b", "Forest Hill", "6A")];
    const games = [game("g", "a", "b", 14, 0)];
    const paper = buildNewspaper(dataset(teams, games), ranks([["a", 11]]), {
      classification: "6A", dates: [DATE],
    });
    const { lead, leadWon } = scoreboardSides(paper.contests[0]);
    expect(lead.school).toBe("Callaway");
    expect(leadWon).toBe(true);
  });

  it("leads with this class's team when it won a cross-class game", () => {
    // 6A Warren Central beat 7A Clinton: already the winner, so nothing moves.
    const teams = [team("wc", "Warren Central", "6A"), team("cl", "Clinton", "7A")];
    const games = [game("g", "wc", "cl", 35, 24)];
    const paper = buildNewspaper(dataset(teams, games), ranks([["wc", 1]]), {
      classification: "6A", dates: [DATE],
    });
    const { lead, foe, leadWon } = scoreboardSides(paper.contests[0]);
    expect(lead.school).toBe("Warren Central");
    expect(foe.school).toBe("Clinton");
    expect(leadWon).toBe(true);
  });
});

describe("leagueWeek", () => {
  const S = "2026-27";

  it("gives each league its own count, offset by two weeks", () => {
    // Same Friday, different label — MAIS opens two weeks earlier.
    expect(leagueWeek(S, "MAIS", "2026-08-28")).toBe(3);
    expect(leagueWeek(S, "MHSAA", "2026-08-28")).toBe(1);
  });

  it("advances a week per slate", () => {
    expect(leagueWeek(S, "MAIS", "2026-08-14")).toBe(1);
    expect(leagueWeek(S, "MAIS", "2026-08-21")).toBe(2);
    expect(leagueWeek(S, "MHSAA", "2026-09-04")).toBe(2);
    expect(leagueWeek(S, "MHSAA", "2026-09-11")).toBe(3);
  });

  it("counts a Thursday opener as part of its Friday slate", () => {
    expect(leagueWeek(S, "MHSAA", "2026-08-27")).toBe(1);
  });

  it("returns null before a league opens or for an unknown season", () => {
    expect(leagueWeek(S, "MHSAA", "2026-08-14")).toBeNull();
    expect(leagueWeek("2099-00", "MHSAA", "2026-08-28")).toBeNull();
  });
});

describe("leagueOf", () => {
  it("splits on the MAIS prefix", () => {
    expect(leagueOf("7A")).toBe("MHSAA");
    expect(leagueOf("MAIS-4A")).toBe("MAIS");
    expect(leagueOf("MAIS-8M-1A")).toBe("MAIS");
  });
});

describe("latestSlate", () => {
  const g = (id: string, date: string, status = "final") =>
    ({ id, date, status } as unknown as Game);

  it("gathers a Thursday-to-Saturday slate but not the week before", () => {
    const games = [
      g("a", "2026-08-21"), // previous week
      g("b", "2026-08-27"), // Thursday
      g("c", "2026-08-28"), // Friday
      g("d", "2026-08-29"), // Saturday
    ];
    expect(latestSlate(games)).toEqual(["2026-08-27", "2026-08-28", "2026-08-29"]);
  });

  it("ignores scheduled games so an upcoming week never wins", () => {
    const games = [g("done", "2026-08-28"), g("next", "2026-09-04", "scheduled")];
    expect(latestSlate(games)).toEqual(["2026-08-28"]);
  });

  it("returns nothing when no game has been played", () => {
    expect(latestSlate([g("x", "2026-09-04", "scheduled")])).toEqual([]);
  });
});
