"use client";
import { usePathname, useSearchParams } from "next/navigation";

const OPTIONS = [
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

  return (
    <select
      className={SELECT_CLASSES}
      value={league}
      onChange={(e) => {
        const sp = new URLSearchParams(params.toString());
        if (e.target.value) sp.set("league", e.target.value);
        else sp.delete("league");
        const qs = sp.toString();
        // Full navigation, not router.push — see team-filters.tsx.
        window.location.assign(qs ? `${pathname}?${qs}` : pathname);
      }}
      aria-label="League"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
