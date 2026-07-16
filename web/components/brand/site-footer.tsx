import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-chrome-500/15 bg-navy-900">
      <div className="max-w-7xl mx-auto py-6 px-4 grid grid-cols-1 sm:grid-cols-3 items-center gap-6">
        <div className="flex items-center gap-3 text-xs text-chrome-500 justify-center sm:justify-start">
          <Image
            src="/brand/scrn-logo.png"
            alt="SCRN"
            width={72}
            height={72}
            className="h-16 w-auto"
          />
          <span>Powered by State Championships Radio Network</span>
        </div>
        <div className="flex flex-col items-center text-center gap-2">
          <Image
            src="/brand/hps-footer-logo.png"
            alt="Hebert Professional Services"
            width={120}
            height={82}
            className="h-16 w-auto"
          />
          <div className="text-xs text-chrome-500">
            Created and Managed by
            <br />
            Hebert Professional Services
          </div>
        </div>
        <a
          href="https://scrn.live"
          className="text-xs text-chrome-300 hover:text-crimson-500 justify-self-center sm:justify-self-end"
        >
          scrn.live →
        </a>
      </div>
    </footer>
  );
}
