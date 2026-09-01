import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, Barlow_Condensed } from "next/font/google";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { CommandPalette } from "@/components/search/command-palette";
import { loadDataset, currentSeason } from "@/lib/data-server";
import { buildSearchEntries } from "@/lib/search-index";
import { previousSeason } from "@/lib/prior";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Varsity Voices · Mississippi HS Football",
  description: "Statewide MHSAA & MAIS football coverage from SCRN.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const pathname = h.get("x-next-pathname") ?? "";
  /**
   * /present pages are broadcast surfaces and drop the site chrome so nothing
   * intrudes on a screenshot. The recap and preview INDEXES are the exception:
   * they are normal dashboard pages you browse from the nav, and only the
   * printed pages they link to need to be chromeless.
   */
  const path = pathname.replace(/\/$/, "");
  const isPaperIndex = path === "/present/newspaper" || path === "/present/preview";
  const chromeless = pathname.startsWith("/present") && !isPaperIndex;

  const season = await currentSeason();
  const data = chromeless ? null : await loadDataset(season);

  // Search players: current rosters, or last season's until they're scraped.
  let searchPlayers = data?.players ?? [];
  let playersSeasonLabel: string | null = null;
  if (data && searchPlayers.length === 0) {
    const prev = await loadDataset(previousSeason(season));
    searchPlayers = prev.players;
    playersSeasonLabel = prev.season.slice(0, 4);
  }

  return (
    <html lang="en" className={`dark ${inter.variable} ${display.variable}`}>
      <body className="min-h-screen flex flex-col">
        {!chromeless && <SiteHeader />}
        <div className="flex-1">{children}</div>
        {!chromeless && <SiteFooter />}
        {!chromeless && data && (
          <CommandPalette
            entries={buildSearchEntries(data.teams, searchPlayers, playersSeasonLabel)}
          />
        )}
      </body>
    </html>
  );
}
