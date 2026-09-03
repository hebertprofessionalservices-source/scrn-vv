import type { Team } from "@/lib/types";
import { runPassLabel, type RunPassSplit } from "@/lib/run-pass";
import {
  outlookRows,
  ydsWithAvg,
  type CompareRow,
} from "@/lib/matchup-format";
import type { MatchupSideData } from "@/lib/team-outlook";
import { CompareTable } from "@/components/matchup/compare-table";

function games(t: Team) { return t.record.wins + t.record.losses; }
function ppg(t: Team) { return games(t) ? t.stats.pointsFor / games(t) : 0; }
function papg(t: Team) { return games(t) ? t.stats.pointsAgainst / games(t) : 0; }

const ROWS: Array<{ label: string; value: (t: Team) => number; betterIsHigher: boolean; format?: (n: number) => string }> = [
  { label: "Wins", value: (t) => t.record.wins, betterIsHigher: true, format: (n) => `${n}` },
  { label: "Losses", value: (t) => t.record.losses, betterIsHigher: false, format: (n) => `${n}` },
  { label: "PPG", value: ppg, betterIsHigher: true, format: (n) => n.toFixed(1) },
  { label: "PA / G", value: papg, betterIsHigher: false, format: (n) => n.toFixed(1) },
];

export function TaleOfTheTape({
  a,
  b,
  runPass,
  sides,
}: {
  a: Team;
  b: Team;
  runPass?: { a: RunPassSplit | null; b: RunPassSplit | null };
  sides?: { a: MatchupSideData; b: MatchupSideData };
}) {
  const rows: CompareRow[] = ROWS.map((row) => {
    const av = row.value(a);
    const bv = row.value(b);
    const fmt = row.format ?? ((n: number) => `${n}`);
    return {
      label: row.label,
      a: fmt(av),
      b: fmt(bv),
      aBetter: row.betterIsHigher ? av > bv : av < bv,
      bBetter: row.betterIsHigher ? bv > av : bv < av,
    };
  });

  if (runPass && (runPass.a || runPass.b)) {
    rows.push({
      label: "Run / Pass %",
      a: runPass.a ? runPassLabel(runPass.a) : "—",
      b: runPass.b ? runPassLabel(runPass.b) : "—",
    });
  }

  if (sides) {
    const extra = outlookRows(sides.a, sides.b);
    // Client's order: offensive efficiency, then yardage w/ averages, then
    // defensive efficiency + strength of schedule.
    rows.push(...extra.slice(0, 1));
    rows.push({
      label: "Rushing Yards",
      a: a.stats.yardsFor > 0 ? ydsWithAvg(a.stats.rushYdsFor, sides.a.avgRush) : "—",
      b: b.stats.yardsFor > 0 ? ydsWithAvg(b.stats.rushYdsFor, sides.b.avgRush) : "—",
    });
    rows.push({
      label: "Passing Yards",
      a: a.stats.yardsFor > 0 ? ydsWithAvg(a.stats.passYdsFor, sides.a.avgPass) : "—",
      b: b.stats.yardsFor > 0 ? ydsWithAvg(b.stats.passYdsFor, sides.b.avgPass) : "—",
    });
    rows.push(...extra.slice(1));
  }

  return <CompareTable rows={rows} />;
}
