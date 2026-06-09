import type { Team } from "@/lib/types";

function games(t: Team) { return t.record.wins + t.record.losses; }
function ppg(t: Team) { return games(t) ? t.stats.pointsFor / games(t) : 0; }
function papg(t: Team) { return games(t) ? t.stats.pointsAgainst / games(t) : 0; }

const ROWS: Array<{ label: string; value: (t: Team) => number; betterIsHigher: boolean; format?: (n: number) => string }> = [
  { label: "Wins", value: (t) => t.record.wins, betterIsHigher: true, format: (n) => `${n}` },
  { label: "Losses", value: (t) => t.record.losses, betterIsHigher: false, format: (n) => `${n}` },
  { label: "PPG", value: ppg, betterIsHigher: true, format: (n) => n.toFixed(1) },
  { label: "PA / G", value: papg, betterIsHigher: false, format: (n) => n.toFixed(1) },
  { label: "State Rank", value: (t) => t.rankings.stateOverall ?? 999, betterIsHigher: false,
    format: (n) => n === 999 ? "—" : `#${n}` },
];

export function TaleOfTheTape({ a, b }: { a: Team; b: Team }) {
  return (
    <div className="rounded-2xl border border-chrome-500/15 overflow-hidden">
      <table className="w-full">
        <tbody>
          {ROWS.map((row) => {
            const av = row.value(a);
            const bv = row.value(b);
            const aBetter = row.betterIsHigher ? av > bv : av < bv;
            const bBetter = row.betterIsHigher ? bv > av : bv < av;
            const fmt = row.format ?? ((n) => `${n}`);
            return (
              <tr key={row.label} className="border-t border-chrome-500/10 first:border-t-0">
                <td className={`px-4 py-3 text-right font-display text-xl ${aBetter ? "text-crimson-500" : ""}`}>{fmt(av)}</td>
                <td className="px-2 py-3 text-center text-xs uppercase text-chrome-500 w-32">{row.label}</td>
                <td className={`px-4 py-3 text-left font-display text-xl ${bBetter ? "text-crimson-500" : ""}`}>{fmt(bv)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
