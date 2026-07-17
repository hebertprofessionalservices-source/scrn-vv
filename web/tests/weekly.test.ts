import { describe, expect, it } from "vitest";
import { buildDataset } from "@/lib/data";
import { buildWeeklyView } from "@/lib/weekly";
import type { BoxScore, Game, Player, Team } from "@/lib/types";

function makeTeam(id: string): Team {
  return {
    id, name: id.toUpperCase(), mascot: null, city: null, classification: "1A",
    district: null, logoUrl: null, colors: { primary: null, secondary: null },
    season: "2025-26", record: { wins: 5, losses: 5 },
    rankings: { stateOverall: null, stateClass: null, national: null },
    stats: {
      pointsFor: 0, pointsAgainst: 0, yardsFor: 0, yardsAgainst: 0,
      passYdsFor: 0, rushYdsFor: 0, passYdsAgainst: 0, rushYdsAgainst: 0,
      turnoversForced: 0, turnoversLost: 0,
    },
    headCoach: null, maxprepsUrl: null,
  };
}

function makePlayer(id: string, teamId: string, name: string): Player {
  return {
    id, teamId, season: "2025-26", name, jersey: "1", position: "ATH",
    class: "SR", height: null, weight: null, gamesPlayed: 10,
    stats: {
      passing: { att: 0, cmp: 0, yds: 0, td: 0, int: 0, rating: 0 },
      rushing: { att: 0, yds: 0, td: 0, ypc: 0 },
      receiving: { rec: 0, yds: 0, td: 0 },
      defense: { tackles: 0, sacks: 0, int: 0, ff: 0 },
      kicking: { fgm: 0, fga: 0, xpm: 0, xpa: 0 },
    },
  };
}

function makeGame(id: string, date: string, home: string, away: string, box: BoxScore): Game {
  return {
    id, season: "2025-26", week: 0, date, homeTeamId: home, awayTeamId: away,
    homeScore: 28, awayScore: 14, quarterScores: { home: [], away: [] },
    status: "final", dataStatus: "complete", venue: null, boxScore: box,
    maxprepsUrl: null,
  };
}

const emptyBox = { passing: [], rushing: [], receiving: [], defense: [] };

const teams = [makeTeam("a"), makeTeam("b")];
const players = [
  makePlayer("qb-a", "a", "Quinn Passer"),
  makePlayer("rb-a", "a", "Randy Rusher"),
  makePlayer("wr-b", "b", "Walt Catcher"),
  makePlayer("lb-b", "b", "Liam Tackler"),
];

// Week of Sep 1 (Fri Sep 5) and week of Sep 8 (Fri Sep 12).
const g1 = makeGame("g1", "2025-09-05T19:00", "a", "b", {
  passing: [{ playerId: "Quinn Passer(Sr)", yds: 312, td: 4, int: 1, att: 30 }],
  rushing: [{ playerId: "Randy Rusher(Jr)", yds: 155, td: 2 }],
  receiving: [{ playerId: "W. Catcher(Sr)", rec: 8, yds: 130, td: 1 }],
  defense: [{ playerId: "Liam Tackler(Sr)", tackles: 16, sacks: 1, int: 0 }],
});
const g2 = makeGame("g2", "2025-09-12T19:00", "b", "a", {
  passing: [{ playerId: "Quinn Passer(Sr)", yds: 180, td: 1, int: 0, att: 22 }],
  rushing: [{ playerId: "Unknown Guy(So)", yds: 300, td: 5 }], // no roster match
  receiving: [],
  defense: [],
});

const data = buildDataset({ teams, players, games: [g1, g2] });

describe("buildWeeklyView", () => {
  const view = buildWeeklyView(data);

  it("groups games into Monday-anchored weeks, numbered in season order", () => {
    expect(view.weeks.map((w) => w.key)).toEqual(["2025-09-01", "2025-09-08"]);
    expect(view.weeks[0].label).toBe("Week 1");
    expect(view.latestKey).toBe("2025-09-08");
  });

  it("attributes box lines to roster players and ranks weekly leaders", () => {
    const wk1 = view.byWeek["2025-09-01"];
    expect(wk1.leaders.QB[0]).toMatchObject({
      playerId: "qb-a", value: 312, line: "312 YDS · 4 TD · 1 INT",
    });
    expect(wk1.leaders.RB[0].playerId).toBe("rb-a");
    expect(wk1.leaders.WR[0]).toMatchObject({ playerId: "wr-b", line: "8 REC · 130 YDS · 1 TD" });
    expect(wk1.leaders.DEF[0].playerId).toBe("lb-b");
  });

  it("labels home/away context with the player's team result", () => {
    const wk1 = view.byWeek["2025-09-01"];
    expect(wk1.leaders.QB[0].context).toBe("vs B · W 28–14"); // home winner
    expect(wk1.leaders.WR[0].context).toBe("@ A · L 14–28"); // away loser
  });

  it("drops box lines that match no roster player", () => {
    const wk2 = view.byWeek["2025-09-08"];
    expect(wk2.leaders.RB).toHaveLength(0); // Unknown Guy's 300 yds not guessed
  });

  it("flags outstanding performances with threshold badges", () => {
    const wk1 = view.byWeek["2025-09-01"];
    const qb = wk1.outstanding.find((o) => o.playerId === "qb-a")!;
    expect(qb.badges).toEqual(["312 PASS YDS", "4 PASS TD"]);
    const rb = wk1.outstanding.find((o) => o.playerId === "rb-a")!;
    expect(rb.badges).toEqual(["155 RUSH YDS", "2 RUSH TD"]);
    const wr = wk1.outstanding.find((o) => o.playerId === "wr-b")!;
    expect(wr.badges).toEqual(["130 REC YDS"]);
    const lb = wk1.outstanding.find((o) => o.playerId === "lb-b")!;
    expect(lb.badges).toEqual(["16 TKL"]);
    // Week 2 QB line (180 yds, 1 TD) doesn't qualify.
    expect(view.byWeek["2025-09-08"].outstanding).toHaveLength(0);
  });

  it("season list is newest-first and reports the uncapped total", () => {
    expect(view.outstandingSeason.length).toBe(4);
    expect(view.outstandingSeasonTotal).toBe(4);
    expect(view.outstandingSeason[0].weekLabel).toBe("Week 1"); // only week with entries
  });

  it("asOf replays the season as of a past date", () => {
    const replay = buildWeeklyView(data, "2025-09-06");
    expect(replay.weeks).toHaveLength(1);
    expect(replay.latestKey).toBe("2025-09-01");
  });

  it("returns an empty view when no box scores exist (preseason)", () => {
    const empty = buildWeeklyView(
      buildDataset({ teams, players, games: [makeGame("g0", "2026-08-28", "a", "b", emptyBox)] }),
      "2026-01-01",
    );
    expect(empty.latestKey).toBeNull();
    expect(empty.weeks).toHaveLength(0);
    expect(empty.outstandingSeason).toHaveLength(0);
  });
});
