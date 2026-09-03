import type { CompareRow } from "@/lib/matchup-format";

/**
 * The head-to-head comparison rows, in a single column.
 *
 * Briefly split across two columns to cut scrolling; the client asked for one
 * column back (Sep 2 2026). The larger, bolder category labels stay.
 */
export function CompareTable({
  rows,
  highlightClass = "text-crimson-500",
}: {
  rows: CompareRow[];
  /** Colour for the better side of a row. */
  highlightClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-chrome-500/15 overflow-hidden">
      <table className="w-full">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-chrome-500/10 first:border-t-0">
              <td
                className={`px-4 py-2.5 text-right font-display text-xl w-[30%] ${
                  row.aBetter ? highlightClass : ""
                }`}
              >
                {row.a}
              </td>
              <td className="px-2 py-2.5 text-center font-display text-sm font-semibold uppercase tracking-wider text-chrome-300">
                {row.label}
              </td>
              <td
                className={`px-4 py-2.5 text-left font-display text-xl w-[30%] ${
                  row.bBetter ? highlightClass : ""
                }`}
              >
                {row.b}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
