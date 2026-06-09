import type { Metadata } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { CommandPalette } from "@/components/search/command-palette";
import { loadDataset } from "@/lib/data-server";
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
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  return (
    <html lang="en" className={`dark ${inter.variable} ${display.variable}`}>
      <body className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <CommandPalette teams={data.teams} players={data.players} />
      </body>
    </html>
  );
}
