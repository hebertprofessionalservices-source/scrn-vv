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
      <Stat
        label="Rushing Yards"
        value={hasPrint ? ydsWithAvg(team.stats.rushYdsFor, avgRush ?? null) : "n/a"}
      />
      <Stat
        label="Passing Yards"
        value={hasPrint ? ydsWithAvg(team.stats.passYdsFor, avgPass ?? null) : "n/a"}
      />
      {/* Two separate stats, one box — client call, Sep 1 2026. */}
      <EfficiencyStat efficiency={e} />
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

/**
 * Offensive and defensive efficiency share one box (client call, Sep 1 2026).
 * They stay two distinct numbers — this is a layout change, not a blend — so
 * each keeps its own label, value and coverage note.
 */
function EfficiencyStat({ efficiency }: { efficiency: TeamEfficiency | null }) {
  const idx = (v: number | null | undefined) =>
    v === null || v === undefined ? "n/a" : String(v);
  return (
    <div className="rounded-xl border border-chrome-500/15 bg-navy-700/40 p-4">
      <div className="text-xs uppercase tracking-wider text-chrome-500">Efficiency</div>
      <div className="mt-1 flex items-baseline gap-4">
        <div>
          <div className="font-display text-2xl">{idx(efficiency?.offIndex)}</div>
          <div className="text-xs uppercase tracking-wider text-chrome-500">Off</div>
        </div>
        <div>
          <div className="font-display text-2xl">{idx(efficiency?.defIndex)}</div>
          <div className="text-xs uppercase tracking-wider text-chrome-500">Def</div>
        </div>
      </div>
      {efficiency?.offYdsPerPlay != null && (
        <div className="text-xs text-chrome-500 mt-0.5">
          {efficiency.offYdsPerPlay.toFixed(1)} yds/play
        </div>
      )}
      {efficiency && efficiency.defCoverage.covered > 0 && (
        <div className="text-xs text-chrome-500 mt-0.5">
          {efficiency.defCoverage.covered} of {efficiency.defCoverage.games} games charted
        </div>
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
