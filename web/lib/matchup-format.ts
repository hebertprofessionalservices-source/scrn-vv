interface WL {
  wins: number;
  losses: number;
}

/** "76.54%" — playoff potential display precision. */
export function fmtPct(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(2)}%`;
}

/** "1st" / "2nd" / "3rd" / "4th" … */
export function ordinal(n: number): string {
  const rem10 = n % 10;
  const rem100 = n % 100;
  if (rem10 === 1 && rem100 !== 11) return `${n}st`;
  if (rem10 === 2 && rem100 !== 12) return `${n}nd`;
  if (rem10 === 3 && rem100 !== 13) return `${n}rd`;
  return `${n}th`;
}

export interface RecordsBlockInput {
  overall: WL;
  classification: WL;
  region: { record: WL; place: number } | null;
  home: WL | null;
  away: WL | null;
  neutral: WL | null;
}

const wl = (r: WL | null) => (r ? `${r.wins}–${r.losses}` : "0–0");

/**
 * Client-approved records format, one string per display line:
 *   Overall 8–2 (Region 3–2 · 2nd place)
 *   Classification 6–1
 *   Home 5–0 · Away 3–2 · Neutral 0–0
 */
export function recordsBlockLines(r: RecordsBlockInput): string[] {
  const regionPart = r.region
    ? ` (Region ${wl(r.region.record)} · ${ordinal(r.region.place)} place)`
    : "";
  return [
    `Overall ${wl(r.overall)}${regionPart}`,
    `Classification ${wl(r.classification)}`,
    `Home ${wl(r.home)} · Away ${wl(r.away)} · Neutral ${wl(r.neutral)}`,
  ];
}

/** "+3.4" / "-1.2" — SOS shown relative to the league-average 0. */
export function fmtSos(v: number | null): string {
  if (v === null) return "—";
  const s = v.toFixed(1);
  return v > 0 ? `+${s}` : s;
}

/** "2,341 (5.2 avg)" — season yardage with per-attempt average. */
export function ydsWithAvg(yds: number, avg: number | null): string {
  return avg === null
    ? yds.toLocaleString()
    : `${yds.toLocaleString()} (${avg.toFixed(1)} avg)`;
}

const sharePct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const idx = (v: number | null) => (v === null ? "n/a" : String(v));

/** Per-side inputs for the extra comparison rows (order = client's list). */
export interface OutlookSide {
  retOff: number | null;
  offEff: number | null;
  defEff: number | null;
  sosPlayed: number | null;
  sosRemaining: number | null;
}

export interface CompareRow {
  label: string;
  a: string;
  b: string;
  aBetter?: boolean;
  bBetter?: boolean;
}

export function outlookRows(a: OutlookSide, b: OutlookSide): CompareRow[] {
  const num = (label: string, va: number | null, vb: number | null, fmt: (v: number | null) => string): CompareRow => ({
    label,
    a: fmt(va),
    b: fmt(vb),
    aBetter: va !== null && vb !== null && va > vb,
    bBetter: va !== null && vb !== null && vb > va,
  });
  return [
    num("Returning Off. Production", a.retOff, b.retOff, sharePct),
    num("Off Efficiency", a.offEff, b.offEff, idx),
    num("Def Efficiency", a.defEff, b.defEff, idx),
    { label: "SOS Rating", a: fmtSos(a.sosPlayed), b: fmtSos(b.sosPlayed) },
    { label: "Remaining SOS", a: fmtSos(a.sosRemaining), b: fmtSos(b.sosRemaining) },
  ];
}
