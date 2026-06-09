import { LedHero } from "@/components/brand/led-hero";

export default function Home() {
  return (
    <LedHero>
      <h1 className="font-display text-5xl md:text-7xl">
        Week 11 · <span className="text-crimson-500">Mississippi</span> HS Football
      </h1>
      <p className="mt-4 text-chrome-300">
        Statewide coverage. Data refreshed Sunday + Tuesday nights.
      </p>
    </LedHero>
  );
}
