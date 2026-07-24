"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { CLASSIFICATIONS, classificationLabel, leagueOf } from "@/lib/team-format";

const LEAGUE_OPTIONS = [
  { value: "", label: "Overall" },
  { value: "MHSAA", label: "MHSAA" },
  { value: "MAIS", label: "MAIS" },
];

const SELECT_CLASSES =
  "bg-navy-700 border border-chrome-500/20 rounded-lg px-3 py-2 text-sm text-chrome-100 cursor-pointer hover:border-crimson-500 focus:outline-none focus:border-crimson-500";

export function RankingsFilter() {
  const params = useSearchParams();
  const pathname = usePathname();
  const league = params.get("league") ?? "";
  const cls = params.get("class") ?? "";

  const classes = league
    ? CLASSIFICATIONS.filter((c) => leagueOf(c) === league)
    : CLASSIFICATIONS;

  function update(nextLeague: string, nextCls: string) {
    const sp = new URLSearchParams(params.toString());
    if (nextLeague) sp.set("league", nextLeague); else sp.delete("league");
    if (nextCls) sp.set("class", nextCls); else sp.delete("class");
    const qs = sp.toString();
    // Full navigation, not router.push — see team-filters.tsx.
    window.location.assign(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <>
      <select
        className={SELECT_CLASSES}
        value={league}
        // League change resets the classification below it.
        onChange={(e) => update(e.target.value, "")}
        aria-label="League"
      >
        {LEAGUE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        className={SELECT_CLASSES}
        value={cls}
        onChange={(e) => update(league, e.target.value)}
        aria-label="Classification"
      >
        <option value="">All Classifications</option>
        {classes.map((c) => (
          <option key={c} value={c}>{classificationLabel(c)}</option>
        ))}
      </select>
    </>
  );
}
