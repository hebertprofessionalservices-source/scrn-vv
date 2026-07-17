"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { classificationLabel } from "@/lib/team-format";

const CLASSES = [
  "7A", "6A", "5A", "4A", "3A", "2A", "1A",
  "MAIS-4A", "MAIS-3A", "MAIS-2A", "MAIS-8M-2A", "MAIS-8M-1A",
];

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
  const cls = params.get("class") ?? "";
  const region = params.get("region") ?? "";

  const classes = CLASSES.filter((c) => regionsByClass[c]?.length);
  const regions = cls
    ? regionsByClass[cls] ?? []
    : classes.flatMap((c) => regionsByClass[c]);

  function update(nextCls: string, nextRegion: string) {
    const sp = new URLSearchParams(params.toString());
    if (nextCls) sp.set("class", nextCls); else sp.delete("class");
    if (nextRegion) sp.set("region", nextRegion); else sp.delete("region");
    router.push(`${pathname}?${sp.toString()}` as any);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        className={SELECT_CLASSES}
        value={cls}
        onChange={(e) => {
          const next = e.target.value;
          // Drop the region unless it still belongs to the new classification.
          const keep = next && (regionsByClass[next] ?? []).includes(region);
          update(next, keep ? region : "");
        }}
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
        onChange={(e) => update(cls, e.target.value)}
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
