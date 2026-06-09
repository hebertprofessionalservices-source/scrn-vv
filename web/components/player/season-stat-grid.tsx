import type { PlayerStats } from "@/lib/types";

export function SeasonStatGrid({ stats }: { stats: PlayerStats }) {
  const groups: Array<{ label: string; entries: Array<[string, number | string]> }> = [];
  if (stats.passing.yds + stats.passing.att > 0) {
    groups.push({ label: "Passing", entries: [
      ["YDS", stats.passing.yds], ["TD", stats.passing.td],
      ["INT", stats.passing.int], ["CMP/ATT", `${stats.passing.cmp}/${stats.passing.att}`],
    ]});
  }
  if (stats.rushing.yds + stats.rushing.att > 0) {
    groups.push({ label: "Rushing", entries: [
      ["YDS", stats.rushing.yds], ["TD", stats.rushing.td],
      ["YPC", stats.rushing.ypc.toFixed(1)], ["ATT", stats.rushing.att],
    ]});
  }
  if (stats.receiving.yds + stats.receiving.rec > 0) {
    groups.push({ label: "Receiving", entries: [
      ["YDS", stats.receiving.yds], ["TD", stats.receiving.td], ["REC", stats.receiving.rec],
    ]});
  }
  if (stats.defense.tackles + stats.defense.sacks + stats.defense.int > 0) {
    groups.push({ label: "Defense", entries: [
      ["TKL", stats.defense.tackles], ["SACK", stats.defense.sacks],
      ["INT", stats.defense.int], ["FF", stats.defense.ff],
    ]});
  }
  if (stats.kicking.fgm + stats.kicking.xpm > 0) {
    groups.push({ label: "Kicking", entries: [
      ["FGM", `${stats.kicking.fgm}/${stats.kicking.fga}`],
      ["XPM", `${stats.kicking.xpm}/${stats.kicking.xpa}`],
    ]});
  }
  if (groups.length === 0) {
    return <p className="text-chrome-500 text-sm">No season stat leaders for this player.</p>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((g) => (
        <div key={g.label} className="rounded-xl border border-chrome-500/15 p-4">
          <div className="text-xs uppercase tracking-wider text-chrome-500 mb-2">{g.label}</div>
          <div className="grid grid-cols-4 gap-3">
            {g.entries.map(([k, v]) => (
              <div key={k}>
                <div className="text-[10px] text-chrome-500">{k}</div>
                <div className="font-display text-xl">{v}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
