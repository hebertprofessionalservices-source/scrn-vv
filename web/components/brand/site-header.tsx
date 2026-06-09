import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-chrome-500/15 bg-navy-900/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto h-16 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/varsity-voices-logo.jpg"
            alt="Varsity Voices"
            width={140}
            height={48}
            className="h-10 w-auto rounded"
            priority
          />
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm uppercase tracking-wide font-display">
          <Link href="/" className="hover:text-crimson-500">
            Home
          </Link>
          <Link href={"/teams" as any} className="hover:text-crimson-500">
            Teams
          </Link>
          <Link href={"/players" as any} className="hover:text-crimson-500">
            Players
          </Link>
        </nav>
        <div className="text-xs text-chrome-500 hidden sm:block">2025–26 · MS</div>
      </div>
    </header>
  );
}
