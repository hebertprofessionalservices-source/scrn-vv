import { describe, expect, it } from "vitest";
import {
  activeClassification,
  classOptionsFor,
  filterSchedule,
} from "@/lib/schedule-filter";

const card = (away: string, home: string, classes: string[]) => ({
  classes,
  away: { name: away },
  home: { name: home },
});

const LEAGUES = [
  {
    league: "MHSAA",
    days: [
      {
        games: [
          card("Tupelo Golden Wave", "Starkville Yellowjackets", ["7A"]),
          card("Houston Hilltoppers", "Ashland Blue Devils", ["3A", "1A"]),
        ],
      },
    ],
  },
  {
    league: "MAIS",
    days: [
      {
        games: [
          card("Winston Academy Patriots", "Carroll Academy Rebels", ["MAIS-2A"]),
          card("Kemper Academy Rams", "Newton County Academy Generals", [
            "MAIS-8M-2A",
            "MAIS-8M-1A",
          ]),
        ],
      },
    ],
  },
];

const countGames = (out: typeof LEAGUES) =>
  out.reduce((n, l) => n + l.days.reduce((m, d) => m + d.games.length, 0), 0);

const NO_FILTERS = { league: "", cls: "", query: "" };

describe("classOptionsFor", () => {
  it("returns every playing classification in display order", () => {
    expect(classOptionsFor(LEAGUES, "")).toEqual([
      "7A", "3A", "1A", "MAIS-2A", "MAIS-8M-2A", "MAIS-8M-1A",
    ]);
  });

  it("narrows to the selected league", () => {
    expect(classOptionsFor(LEAGUES, "MHSAA")).toEqual(["7A", "3A", "1A"]);
    expect(classOptionsFor(LEAGUES, "MAIS")).toEqual([
      "MAIS-2A", "MAIS-8M-2A", "MAIS-8M-1A",
    ]);
  });
});

describe("activeClassification", () => {
  it("keeps a classification that is still on offer", () => {
    expect(activeClassification("7A", ["7A", "3A"])).toBe("7A");
  });

  it("falls back to all when the league switch removed it", () => {
    expect(activeClassification("7A", ["MAIS-2A"])).toBe("");
  });
});

describe("filterSchedule", () => {
  it("returns everything when no filter is set", () => {
    expect(countGames(filterSchedule(LEAGUES, NO_FILTERS))).toBe(4);
  });

  it("filters by league", () => {
    const out = filterSchedule(LEAGUES, { ...NO_FILTERS, league: "MAIS" });
    expect(out.map((l) => l.league)).toEqual(["MAIS"]);
    expect(countGames(out)).toBe(2);
  });

  it("filters by classification across both leagues", () => {
    const out = filterSchedule(LEAGUES, { ...NO_FILTERS, cls: "MAIS-2A" });
    expect(countGames(out)).toBe(1);
    expect(out[0].days[0].games[0].away.name).toBe("Winston Academy Patriots");
  });

  it("matches a cross-class game from either side", () => {
    // Houston (3A) hosts Ashland (1A) — it belongs to both filters.
    expect(countGames(filterSchedule(LEAGUES, { ...NO_FILTERS, cls: "3A" }))).toBe(1);
    expect(countGames(filterSchedule(LEAGUES, { ...NO_FILTERS, cls: "1A" }))).toBe(1);
  });

  it("combines league and classification", () => {
    const out = filterSchedule(LEAGUES, { league: "MAIS", cls: "MAIS-8M-1A", query: "" });
    expect(countGames(out)).toBe(1);
  });

  it("ignores a classification that the chosen league does not have", () => {
    // 7A is MHSAA-only; picking MAIS must not blank the page.
    const out = filterSchedule(LEAGUES, { league: "MAIS", cls: "7A", query: "" });
    expect(countGames(out)).toBe(2);
  });

  it("still filters by team name, and combines with the dropdowns", () => {
    expect(countGames(filterSchedule(LEAGUES, { ...NO_FILTERS, query: "tupelo" }))).toBe(1);
    expect(
      countGames(filterSchedule(LEAGUES, { league: "MAIS", cls: "", query: "tupelo" })),
    ).toBe(0);
  });

  it("drops leagues and days that end up empty", () => {
    const out = filterSchedule(LEAGUES, { ...NO_FILTERS, query: "no such team" });
    expect(out).toEqual([]);
  });
});
