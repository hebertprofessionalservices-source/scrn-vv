import type { TeamEfficiency } from "@/lib/efficiency";
import type { Team } from "@/lib/types";
import {
  fmtPct,
  fmtSos,
  recordsBlockLines,
  ydsWithAvg,
  type RecordsBlockInput,
} from "@/lib/matchup-format";
import type { SosInfo } from "@/lib/team-outlook";

export interface TeamPlayoffCard {
  current: number | null;
  ifWin: number | null;
  ifLoss: number | null;
  /** Next opponent the win/loss numbers are conditioned on. */
  oppName: string | null;
}

export function TeamStatPanel({
  team,
  efficiency,
  runPass,
  records,
  avgRush,
  avgPass,
  returningOff,
  sos,
  playoff,
}: {
  team: Team;
  efficiency?: TeamEfficiency | null;
  /** Season rush/pass attempt totals summed from the roster. */
  runPass?: { rush: number; pass: number } | null;
  records?: RecordsBlockInput | null;
  avgRush?: number | null;
  avgPass?: number | null;
  returningOff?: number | null;
  sos?: SosInfo | null;
  playoff?: TeamPlayoffCard | null;
}) {
  const games = team.record.wins + team.record.losses;
  const ppg = games ? (team.stats.pointsFor / games).toFixed(1) : "—";
  const papg = games ? (team.stats.pointsAgainst / games).toFixed(1) : "—";
  const e = efficiency ?? null;
  const plays = (runPass?.rush ?? 0) + (runPass?.pass ?? 0);
  const runShare = plays > 0 ? Math.round((runPass!.rush / plays) * 100) : null;
  const hasPrint = team.stats.yardsFor > 0;
  const recordLines = records ? recordsBlockLines(records) : null;
  const sharePct = (v: number | null | undefined) =>
    v == null ? "n/a" : `${Math.round(v * 100)}%`;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {recordLines ? (
        <Stat label="Record" value={recordLines[0].replace(/^Overall /, "")} subs={recordLines.slice(1)} />
      ) : (
        <Stat label="Record" value={`${team.record.wins}–${team.record.losses}`} />
      )}
      <Stat label="PPG" value={ppg} />
      <Stat label="PA / G" value={papg} />
      {runPass != null && (
        <Stat
          label="Run / Pass"
          value={runShare !== null ? `${runShare}% / ${100 - runShare}%` : "n/a"}
          sub={
            runShare !== null
              ? `${runPass.rush.toLocaleString()} rush · ${runPass.pass.toLocaleString()} pass att`
              : undefined
          }
        />
      )}
      {returningOff !== undefined && (
        <Stat label="Returning Off. Production" value={sharePct(returningOff)} />
      )}
      <Stat
        label="Rushing Yards"
        value={hasPrint ? ydsWithAvg(team.stats.rushYdsFor, avgRush ?? null) : "n/a"}
      />
      <Stat
        label="Passing Yards"
        value={hasPrint ? ydsWithAvg(team.stats.passYdsFor, avgPass ?? null) : "n/a"}
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
      {sos && <Stat label="SOS Rating" value={fmtSos(sos.played)} />}
      {sos && <Stat label="Remaining SOS" value={fmtSos(sos.remaining)} />}
      {playoff && (
        <Stat
          label="Playoff Potential"
          value={fmtPct(playoff.current)}
          subs={
            playoff.oppName && (playoff.ifWin !== null || playoff.ifLoss !== null)
              ? [
                  `if win/loss vs ${playoff.oppName}:`,
                  `${fmtPct(playoff.ifWin)} / ${fmtPct(playoff.ifLoss)}`,
                ]
              : undefined
          }
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  subs,
}: {
  label: string;
  value: string;
  sub?: string;
  subs?: string[];
}) {
  const lines = subs ?? (sub ? [sub] : []);
  return (
    <div className="rounded-xl border border-chrome-500/15 bg-navy-700/40 p-4">
      <div className="text-xs uppercase tracking-wider text-chrome-500">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
      {lines.map((l) => (
        <div key={l} className="text-xs text-chrome-500 mt-0.5">{l}</div>
      ))}
    </div>
  );
}
