import type { Team } from "@/lib/types";

export function TeamStatPanel({ team }: { team: Team }) {
  const games = team.record.wins + team.record.losses;
  const ppg = games ? (team.stats.pointsFor / games).toFixed(1) : "—";
  const papg = games ? (team.stats.pointsAgainst / games).toFixed(1) : "—";
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat label="Record" value={`${team.record.wins}–${team.record.losses}`} />
      <Stat label="PPG" value={ppg} />
      <Stat label="PA / G" value={papg} />
      <Stat
        label="State Rank"
        value={team.rankings.stateOverall ? `#${team.rankings.stateOverall}` : "—"}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-chrome-500/15 bg-navy-700/40 p-4">
      <div className="text-xs uppercase tracking-wider text-chrome-500">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
    </div>
  );
}
