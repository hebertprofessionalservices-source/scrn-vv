import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-chrome-500/15 bg-navy-900">
      <div className="max-w-7xl mx-auto py-6 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-chrome-500">
          <Image
            src="/brand/scrn-logo.png"
            alt="SCRN"
            width={36}
            height={36}
            className="h-8 w-auto"
          />
          <span>Powered by State Championships Radio Network</span>
        </div>
        <a
          href="https://scrn.live"
          className="text-xs text-chrome-300 hover:text-crimson-500"
        >
          scrn.live →
        </a>
      </div>
    </footer>
  );
}
