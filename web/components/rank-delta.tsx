/** Week-over-week rank movement chip: green up / red down, signed. */
export function RankDeltaChip({ delta }: { delta: number | null | undefined }) {
  if (delta == null || delta === 0) return null;
  const up = delta > 0;
  return (
    <span
      className={`font-display whitespace-nowrap ${up ? "text-green-400" : "text-red-400"}`}
    >
      {up ? "▲" : "▼"}{up ? "+" : "-"}{Math.abs(delta)}
    </span>
  );
}
