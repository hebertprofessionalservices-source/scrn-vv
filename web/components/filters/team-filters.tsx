"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { classificationLabel, leagueOf } from "@/lib/team-format";

const CLASSES = [
  "7A", "6A", "5A", "4A", "3A", "2A", "1A",
  "MAIS-4A", "MAIS-3A", "MAIS-2A", "MAIS-8M-2A", "MAIS-8M-1A",
];

const LEAGUES = ["MHSAA", "MAIS"] as const;

const SELECT_CLASSES =
  "bg-navy-700 border border-chrome-500/20 rounded-lg px-3 py-2 text-sm text-chrome-100 cursor-pointer hover:border-crimson-500 focus:outline-none focus:border-crimson-500";

export function TeamFilters({
  regionsByClass,
}: {
  /** District labels present in the data, keyed by classification. */
  regionsByClass: Record<string, string[]>;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const league = params.get("league") ?? "";
  const cls = params.get("class") ?? "";
  const region = params.get("region") ?? "";

  const allClasses = CLASSES.filter((c) => regionsByClass[c]?.length);
  const classes = league
    ? allClasses.filter((c) => leagueOf(c) === league)
    : allClasses;
  const regions = cls
    ? regionsByClass[cls] ?? []
    : classes.flatMap((c) => regionsByClass[c]);

  function update(nextLeague: string, nextCls: string, nextRegion: string) {
    const sp = new URLSearchParams(params.toString());
    if (nextLeague) sp.set("league", nextLeague); else sp.delete("league");
    if (nextCls) sp.set("class", nextCls); else sp.delete("class");
    if (nextRegion) sp.set("region", nextRegion); else sp.delete("region");
    const qs = sp.toString();
    // Never push a trailing "?": the production router ignores it.
    router.push((qs ? `${pathname}?${qs}` : pathname) as any);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        className={SELECT_CLASSES}
        value={league}
        // Hierarchy: League > Classification > Region — changing a filter
        // resets everything below it and never touches what's above.
        onChange={(e) => update(e.target.value, "", "")}
        aria-label="League"
      >
        <option value="">All Leagues</option>
        {LEAGUES.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>
      <select
        className={SELECT_CLASSES}
        value={cls}
        onChange={(e) => update(league, e.target.value, "")}
        aria-label="Classification"
      >
        <option value="">All Classifications</option>
        {classes.map((c) => (
          <option key={c} value={c}>{classificationLabel(c)}</option>
        ))}
      </select>
      <select
        className={SELECT_CLASSES}
        value={region}
        onChange={(e) => update(league, cls, e.target.value)}
        aria-label="Region"
      >
        <option value="">All Regions</option>
        {regions.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
    </div>
  );
}
