/**
 * Left/right arrows for switching between weeks on the recap and preview
 * index pages. Plain anchors — see site-header.tsx on why links here avoid
 * client-side routing — and unlabelled, since the surrounding page already
 * says "Week N" beside each league.
 */
export function WeekNav({
  prevHref,
  nextHref,
}: {
  prevHref: string | null;
  nextHref: string | null;
}) {
  return (
    <div className="flex items-center gap-3 mt-2">
      {prevHref ? (
        <a
          href={prevHref}
          aria-label="Previous week"
          className="flex items-center justify-center w-10 h-10 rounded border border-chrome-500/20 hover:border-crimson-500 hover:text-crimson-500"
        >
          ←
        </a>
      ) : (
        <span
          aria-hidden
          className="flex items-center justify-center w-10 h-10 rounded border border-chrome-500/10 text-chrome-500/30"
        >
          ←
        </span>
      )}
      {nextHref ? (
        <a
          href={nextHref}
          aria-label="Next week"
          className="flex items-center justify-center w-10 h-10 rounded border border-chrome-500/20 hover:border-crimson-500 hover:text-crimson-500"
        >
          →
        </a>
      ) : (
        <span
          aria-hidden
          className="flex items-center justify-center w-10 h-10 rounded border border-chrome-500/10 text-chrome-500/30"
        >
          →
        </span>
      )}
    </div>
  );
}
