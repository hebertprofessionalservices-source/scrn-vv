import { describe, expect, it } from "vitest";
import {
  buildSeries,
  careerMilestone,
  coachSummary,
  coachVsCoach,
  coachVsOpponent,
  type AfhsGame,
  type CoachPage,
} from "@/lib/history";

function game(
  team: string, year: number, opponent: string,
  teamScore: number, oppScore: number,
  loc: "home" | "away" = "home",
): AfhsGame {
  return {
    team, year, date: null, opponent, loc, teamScore, oppScore,
    result: teamScore > oppScore ? "W" : teamScore < oppScore ? "L" : "T",
    ot: null, district: false, playoff: null,
  };
}

describe("buildSeries", () => {
  const games = [
    game("Oxford", 1990, "Tupelo", 14, 7),
    game("Oxford", 1991, "Tupelo", 21, 20, "away"),
    game("Oxford", 1992, "Tupelo", 7, 7),
    game("Oxford", 1993, "Tupelo", 10, 28),
    game("Oxford", 1994, "Tupelo", 6, 45),
    game("Oxford", 2025, "Tupelo", 27, 21),
    game("Oxford", 2000, "Starkville", 30, 0), // different opponent, ignored
  ];

  it("computes all-time record, first/last meetings, and extremes", () => {
    const s = buildSeries(games, "Oxford", "Tupelo")!;
    expect([s.aWins, s.bWins, s.ties]).toEqual([3, 2, 1]);
    expect(s.first.year).toBe(1990);
    expect(s.last.year).toBe(2025);
    expect(s.first.host).toBe("Oxford");
    expect(s.mostAllowedByA).toEqual({ points: 45, year: 1994 });
    expect(s.mostAllowedByB).toEqual({ points: 27, year: 2025 });
  });

  it("tracks current and longest streaks with years", () => {
    const s = buildSeries(games, "Oxford", "Tupelo")!;
    expect(s.currentStreak).toEqual({
      school: "Oxford", count: 1, startYear: 2025, endYear: 2025,
    });
    // Oxford's 1990-91 streak came first; equal-length later streaks don't displace it.
    expect(s.longestStreak).toEqual({
      school: "Oxford", count: 2, startYear: 1990, endYear: 1991,
    });
  });

  it("returns null when the schools never met", () => {
    expect(buildSeries(games, "Oxford", "Pearl")).toBeNull();
  });
});

const coachPages: CoachPage[] = [
  {
    team: "Oxford",
    currentCoach: "Chris Cutcliffe",
    stints: [
      { team: "Oxford", coach: "Chris Cutcliffe", startYear: 2016, endYear: 2026, wins: 88, losses: 35, ties: 0 },
      { team: "Oxford", coach: "Johnny Hill", startYear: 2000, endYear: 2015, wins: 143, losses: 60, ties: 0 },
    ],
  },
  {
    team: "Tupelo",
    currentCoach: "Ty Hardin",
    stints: [
      { team: "Tupelo", coach: "Ty Hardin", startYear: 2020, endYear: 2026, wins: 55, losses: 15, ties: 0 },
    ],
  },
  {
    team: "Pearl",
    currentCoach: null,
    stints: [
      { team: "Pearl", coach: "Chris Cutcliffe", startYear: 2012, endYear: 2015, wins: 10, losses: 30, ties: 1 },
    ],
  },
];

describe("coachSummary", () => {
  it("caps tenure at the latest played season and sums career across schools", () => {
    const c = coachSummary({ coachPages, games: [] }, "Oxford", 2025)!;
    expect(c.name).toBe("Chris Cutcliffe");
    expect(c.yearsAtSchool).toBe(10); // 2016..2025
    expect(c.atSchool).toEqual({ wins: 88, losses: 35, ties: 0 });
    expect(c.career).toEqual({ wins: 98, losses: 65, ties: 1 }); // + Pearl stint
  });

  it("returns null when no current coach is on record", () => {
    expect(coachSummary({ coachPages, games: [] }, "Pearl", 2025)).toBeNull();
  });
});

describe("coach vs opponent / coach vs coach", () => {
  const games = [
    game("Oxford", 2014, "Tupelo", 20, 10), // before Cutcliffe at Oxford
    game("Oxford", 2021, "Tupelo", 28, 14),
    game("Oxford", 2022, "Tupelo", 7, 35),
    game("Oxford", 2019, "Tupelo", 17, 6), // Cutcliffe yes, Hardin no
  ];

  it("counts only meetings during the coach's tenure at that school", () => {
    const rec = coachVsOpponent({ coachPages, games }, "Oxford", "Tupelo")!;
    expect(rec).toEqual({ wins: 2, losses: 1, ties: 0 }); // 2019, 2021, 2022
  });

  it("coach vs coach counts only overlapping tenures", () => {
    const h2h = coachVsCoach({ coachPages, games }, "Oxford", "Tupelo")!;
    expect(h2h.aName).toBe("Chris Cutcliffe");
    expect(h2h.bName).toBe("Ty Hardin");
    expect([h2h.aWins, h2h.bWins, h2h.ties]).toEqual([1, 1, 0]); // 2021, 2022
  });
});

describe("careerMilestone", () => {
  it("flags coaches within 3 wins of a century mark", () => {
    expect(
      careerMilestone({ name: "x", yearsAtSchool: 1, atSchool: { wins: 0, losses: 0, ties: 0 }, career: { wins: 198, losses: 0, ties: 0 } }),
    ).toEqual({ target: 200, needed: 2 });
    expect(
      careerMilestone({ name: "x", yearsAtSchool: 1, atSchool: { wins: 0, losses: 0, ties: 0 }, career: { wins: 150, losses: 0, ties: 0 } }),
    ).toBeNull();
  });
});

describe("sanitizeCoachName", () => {
  const team = (name: string) => ({ name }) as never;
  it("keeps plausible names and trims whitespace", async () => {
    const { sanitizeCoachName } = await import("@/lib/matchup-history");
    expect(sanitizeCoachName(" Eugene Clinton ", "Brandon Bulldogs")).toBe("Eugene Clinton");
    expect(sanitizeCoachName("g richardson", "Greenville Hornets")).toBe("g richardson");
  });
  it("rejects blanks, digits, and school/mascot junk", async () => {
    const { sanitizeCoachName } = await import("@/lib/matchup-history");
    expect(sanitizeCoachName(null, "Brandon Bulldogs")).toBeNull();
    expect(sanitizeCoachName("  ", "Brandon Bulldogs")).toBeNull();
    expect(sanitizeCoachName("Vaweiny 3", "Columbus Falcons")).toBeNull();
    expect(sanitizeCoachName("Bayou Academy", "Bayou Academy Colts")).toBeNull();
    expect(sanitizeCoachName("TC BRAVES ", "Tishomingo County Braves")).toBeNull();
  });
  it("coachDisplayName prefers the AFHS summary over MaxPreps", async () => {
    const { coachDisplayName } = await import("@/lib/matchup-history");
    const summary = { name: "Eugene Clinton", yearsAtSchool: 1, atSchool: { wins: 0, losses: 0, ties: 0 }, career: { wins: 0, losses: 0, ties: 0 } };
    const t = { name: "Brandon Bulldogs", headCoach: "Ayden Collier" } as never;
    expect(coachDisplayName(summary, t)).toBe("Eugene Clinton");
    expect(coachDisplayName(null, t)).toBe("Ayden Collier");
    expect(coachDisplayName(null, { name: "Brandon Bulldogs", headCoach: null } as never)).toBeNull();
  });
});

describe("vacant coach entries", () => {
  const coachPages: CoachPage[] = [
    {
      team: "Grenada",
      currentCoach: "Vacant",
      stints: [{ team: "Grenada", coach: "Vacant", startYear: 2026, endYear: 2026, wins: 0, losses: 0, ties: 0 }],
    },
  ];
  it("coachSummary treats AFHS 'Vacant' as no coach", () => {
    expect(coachSummary({ coachPages, games: [] }, "Grenada", 2026)).toBeNull();
    expect(coachVsOpponent({ coachPages, games: [] }, "Grenada", "Oxford")).toBeNull();
  });
});
