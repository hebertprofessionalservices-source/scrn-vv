import type { CompareRow } from "@/lib/matchup-format";

/**
 * The head-to-head comparison rows, split across two columns on wide screens.
 *
 * A single stacked column ran 13 rows deep and pushed everything below it off
 * screen; the client asked to spread it wider and scroll less (Sep 2 2026).
 * Two columns halve the height without shrinking anything, and the category
 * labels are set larger and bolder so they carry the row rather than the
 * numbers having to.
 */
export function CompareTable({
  rows,
  highlightClass = "text-crimson-500",
}: {
  rows: CompareRow[];
  /** Colour for the better side of a row. */
  highlightClass?: string;
}) {
  // Odd counts put the extra row in the left column, so the left is never
  // shorter than the right and the block stays visually bottom-aligned.
  const split = Math.ceil(rows.length / 2);
  const columns = [rows.slice(0, split), rows.slice(split)];

  return (
    <div className="grid lg:grid-cols-2 lg:gap-6">
      {columns.map((column, i) => (
        <div
          key={i}
          className={`rounded-2xl border border-chrome-500/15 overflow-hidden ${
            i === 1 && column.length === 0 ? "hidden" : ""
          }`}
        >
          <table className="w-full">
            <tbody>
              {column.map((row) => (
                <tr key={row.label} className="border-t border-chrome-500/10 first:border-t-0">
                  <td
                    className={`px-3 py-2.5 text-right font-display text-xl w-[30%] ${
                      row.aBetter ? highlightClass : ""
                    }`}
                  >
                    {row.a}
                  </td>
                  <td className="px-2 py-2.5 text-center font-display text-sm font-semibold uppercase tracking-wider text-chrome-300">
                    {row.label}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-left font-display text-xl w-[30%] ${
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
      ))}
    </div>
  );
}
