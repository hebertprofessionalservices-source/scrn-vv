"use client";

import { useEffect, useState } from "react";

/**
 * The matchup's sticky team header, which condenses once you scroll.
 *
 * Past the threshold it drops to the very top of the viewport at a z-index
 * above the site nav, so the nav is covered rather than stacked on top of —
 * that is what makes it "disappear" without the global layout needing to know
 * anything about this page. At the same time the info rows collapse, leaving
 * only the crest and the name-and-rank line (client, Sep 2 2026).
 *
 * Children opt into collapsing by carrying `group-data-[condensed=true]:hidden`;
 * the wrapper is the Tailwind group and publishes the state as a data attribute.
 */

/** Pixels of scroll before the header condenses. */
const THRESHOLD = 120;

export function StickyMatchupHeader({
  children,
  broadcast = false,
  className = "",
}: {
  children: React.ReactNode;
  /** Broadcast pages have no site chrome, so they already sit at the top. */
  broadcast?: boolean;
  className?: string;
}) {
  const [condensed, setCondensed] = useState(false);

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const stuck = broadcast || condensed;
  return (
    <div
      data-condensed={condensed}
      className={`group sticky ${stuck ? "top-0 z-50" : "top-24 z-30"} -mx-4 px-4 py-3 bg-navy-900/95 backdrop-blur border-b border-chrome-500/15 ${className}`}
    >
      {children}
    </div>
  );
}
