interface WL {
  wins: number;
  losses: number;
}

export interface RecordSplits {
  home: WL | null;
  away: WL | null;
  neutral: WL | null;
  region: WL | null;
}

/** "76.54%" — playoff potential display precision. */
export function fmtPct(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(2)}%`;
}

/** "3–1 · Home 2–0 · Away 1–1 · Region 1–0" (neutral only when played). */
export function recordSplitsLabel(record: WL, splits: RecordSplits): string {
  const parts = [`${record.wins}–${record.losses}`];
  const add = (label: string, r: WL | null, always: boolean) => {
    if (r && (always || r.wins + r.losses > 0)) {
      parts.push(`${label} ${r.wins}–${r.losses}`);
    }
  };
  add("Home", splits.home, true);
  add("Away", splits.away, true);
  add("Neutral", splits.neutral, false);
  add("Region", splits.region, true);
  return parts.join(" · ");
}
