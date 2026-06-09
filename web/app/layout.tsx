import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, Barlow_Condensed } from "next/font/google";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { CommandPalette } from "@/components/search/command-palette";
import { loadDataset, currentSeason } from "@/lib/data-server";
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
  const isPresent = pathname.startsWith("/present");

  const season = await currentSeason();
  const data = isPresent ? null : await loadDataset(season);

  return (
    <html lang="en" className={`dark ${inter.variable} ${display.variable}`}>
      <body className="min-h-screen flex flex-col">
        {!isPresent && <SiteHeader />}
        <div className="flex-1">{children}</div>
        {!isPresent && <SiteFooter />}
        {!isPresent && data && <CommandPalette teams={data.teams} players={data.players} />}
      </body>
    </html>
  );
}
