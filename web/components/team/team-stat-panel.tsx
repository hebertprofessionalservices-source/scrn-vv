import type { TeamEfficiency } from "@/lib/efficiency";
import type { Team } from "@/lib/types";

export function TeamStatPanel({
  team,
  efficiency,
  runPass,
}: {
  team: Team;
  efficiency?: TeamEfficiency | null;
  /** Season rush/pass attempt totals summed from the roster. */
  runPass?: { rush: number; pass: number } | null;
}) {
  const games = team.record.wins + team.record.losses;
  const ppg = games ? (team.stats.pointsFor / games).toFixed(1) : "—";
  const papg = games ? (team.stats.pointsAgainst / games).toFixed(1) : "—";
  const e = efficiency ?? null;
  const plays = (runPass?.rush ?? 0) + (runPass?.pass ?? 0);
  const runShare = plays > 0 ? Math.round((runPass!.rush / plays) * 100) : null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat label="Record" value={`${team.record.wins}–${team.record.losses}`} />
      <Stat label="PPG" value={ppg} />
      <Stat label="PA / G" value={papg} />
      <Stat
        label="State Rank"
        value={team.rankings.stateOverall ? `#${team.rankings.stateOverall}` : "—"}
      />
      <Stat
        label="Off Efficiency"
        value={e?.offIndex !== null && e?.offIndex !== undefined ? String(e.offIndex) : "n/a"}
        sub={
          e?.offYdsPerPlay != null
            ? `${e.offYdsPerPlay.toFixed(1)} yds/play`
            : undefined
        }
      />
      <Stat
        label="Def Efficiency"
        value={e?.defIndex !== null && e?.defIndex !== undefined ? String(e.defIndex) : "n/a"}
        sub={
          e && e.defCoverage.covered > 0
            ? `${e.defCoverage.covered} of ${e.defCoverage.games} games charted`
            : undefined
        }
      />
      <Stat
        label="Yds / Play"
        value={e?.offYdsPerPlay != null ? e.offYdsPerPlay.toFixed(1) : "n/a"}
        sub={
          e?.offYdsPerRush != null && e?.offYdsPerPass != null
            ? `${e.offYdsPerRush.toFixed(1)} rush · ${e.offYdsPerPass.toFixed(1)} pass`
            : undefined
        }
      />
      <Stat
        label="Def Yds / G"
        value={e?.defYdsPerGame != null ? e.defYdsPerGame.toFixed(0) : "n/a"}
        sub={
          e?.defYdsPerPass != null
            ? `${e.defYdsPerPass.toFixed(1)} per pass att`
            : undefined
        }
      />
      <Stat
        label="Run / Pass"
        value={runShare !== null ? `${runShare}% / ${100 - runShare}%` : "n/a"}
        sub={
          runShare !== null
            ? `${runPass!.rush.toLocaleString()} rush · ${runPass!.pass.toLocaleString()} pass att`
            : undefined
        }
      />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-chrome-500/15 bg-navy-700/40 p-4">
      <div className="text-xs uppercase tracking-wider text-chrome-500">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
      {sub && <div className="text-xs text-chrome-500 mt-0.5">{sub}</div>}
    </div>
  );
}
