interface WL {
  wins: number;
  losses: number;
}

export interface RecordSplits {
  classification: WL;
  region: WL;
}

/** "76.54%" — playoff potential display precision. */
export function fmtPct(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(2)}%`;
}

/** "Overall 3–1 · Classification 2–1 · Region 1–0" — always all three. */
export function recordSplitsLabel(record: WL, splits: RecordSplits): string {
  const wl = (r: WL) => `${r.wins}–${r.losses}`;
  return [
    `Overall ${wl(record)}`,
    `Classification ${wl(splits.classification)}`,
    `Region ${wl(splits.region)}`,
  ].join(" · ");
}
