import Image from "next/image";
import Link from "next/link";
import { availableSeasons, currentSeason } from "@/lib/data-server";
import { SeasonSwitcher } from "@/components/filters/season-switcher";
import { SearchTrigger } from "./search-trigger";
import { MobileNav } from "./mobile-nav";

export async function SiteHeader() {
  const [seasons, current] = await Promise.all([availableSeasons(), currentSeason()]);
  return (
    <header className="border-b border-chrome-500/15 bg-navy-900/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto h-24 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/varsity-voices-logo.jpg"
            alt="Varsity Voices"
            width={140}
            height={48}
            className="h-20 w-auto rounded"
            priority
          />
        </Link>
        {/* Plain anchors: a hydration-race click on a client-side <Link> can
            be silently dropped; native navigation always fires. */}
        <nav className="hidden md:flex items-center gap-6 text-sm uppercase tracking-wide font-display">
          <a href="/" className="hover:text-crimson-500">
            Home
          </a>
          <a href="/upcoming" className="hover:text-crimson-500">
            Upcoming Games
          </a>
          <a href="/standings" className="hover:text-crimson-500">
            Standings
          </a>
          <a href="/teams" className="hover:text-crimson-500">
            Teams
          </a>
          <a href="/players" className="hover:text-crimson-500">
            Players
          </a>
          <a href="/matchup" className="hover:text-crimson-500">
            Match Up
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <SearchTrigger />
          <SeasonSwitcher current={current} options={seasons} />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
