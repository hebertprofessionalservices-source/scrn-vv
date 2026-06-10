import { loadDataset, loadEditorial, currentSeason } from "@/lib/data-server";
import { LedHero } from "@/components/brand/led-hero";
import { TopPerformerCard } from "@/components/cards/top-performer-card";
import { TopDefenseCard } from "@/components/cards/top-defense-card";
import { GameOfTheWeekCard } from "@/components/cards/game-of-the-week-card";
import { ScoreStrip } from "@/components/cards/score-strip";
import { buildEditorialContext } from "@/lib/editorial";
import { topPlayersByStat, topDefensesByPPG, lastWeeksGames } from "@/lib/stats";
import type { Player, Team } from "@/lib/types";

export default async function Home() {
  const season = await currentSeason();
  const data = await loadDataset(season);
  const editorial = await loadEditorial();
  const ctx = buildEditorialContext(editorial, data.games, data.teams);

  if (data.teams.length === 0) {
    return <PreseasonEmptyState season={season} />;
  }

  const topQBs = topPlayersByStat(data.players, "QB", (p) => p.stats.passing.yds, 3);
  const topRBs = topPlayersByStat(data.players, "RB", (p) => p.stats.rushing.yds, 3);
  const topWRs = topPlayersByStat(data.players, "WR", (p) => p.stats.receiving.yds, 3);
  const topDef = topDefensesByPPG(data.teams, 3);

  const lastWeek = lastWeeksGames(data.games);

  const hostGame = ctx.hostPickGame;
  const algoGame = ctx.algorithmPickGame;

  return (
    <>
      <LedHero>
        <div className="text-xs uppercase tracking-wider text-crimson-500">Week {editorial?.currentWeek ?? "—"}</div>
        <h1 className="font-display text-5xl md:text-7xl mt-1">
          Mississippi <span className="text-crimson-500">HS Football</span>
        </h1>
        {editorial?.featuredQuote && (
          <p className="mt-4 italic text-chrome-300">&ldquo;{editorial.featuredQuote}&rdquo;</p>
        )}
      </LedHero>

      <section className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-6">
        {hostGame && (
          <GameOfTheWeekCard
            game={hostGame}
            away={data.teamsById.get(hostGame.awayTeamId)}
            home={data.teamsById.get(hostGame.homeTeamId)}
            label={`Host's Pick · ${editorial?.gameOfTheWeek?.pickedBy ?? ""}`}
            storyline={editorial?.gameOfTheWeek?.storyline ?? ""}
          />
        )}
        {algoGame && (
          <GameOfTheWeekCard
            game={algoGame}
            away={data.teamsById.get(algoGame.awayTeamId)}
            home={data.teamsById.get(algoGame.homeTeamId)}
            label="Algorithm's Pick"
            storyline="Top-ranked teams + tight matchup score."
          />
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 space-y-8 pb-12">
        <Row label="Top 3 Quarterbacks" players={topQBs} teamsById={data.teamsById}
          headline={(p) => `${p.stats.passing.yds.toLocaleString()} YDS · ${p.stats.passing.td} TD`}
          secondary={(p) => `INT ${p.stats.passing.int} · RAT ${p.stats.passing.rating.toFixed(1)}`} />
        <Row label="Top 3 Running Backs" players={topRBs} teamsById={data.teamsById}
          headline={(p) => `${p.stats.rushing.yds.toLocaleString()} YDS · ${p.stats.rushing.td} TD`}
          secondary={(p) => `${p.stats.rushing.att} ATT · ${p.stats.rushing.ypc.toFixed(1)} YPC`} />
        <Row label="Top 3 Receivers" players={topWRs} teamsById={data.teamsById}
          headline={(p) => `${p.stats.receiving.yds.toLocaleString()} YDS · ${p.stats.receiving.td} TD`}
          secondary={(p) => `${p.stats.receiving.rec} REC`} />

        <div>
          <h2 className="font-display text-2xl mb-3">Top 3 Defenses</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {topDef.map((d, i) => (
              <TopDefenseCard key={d.team.id} team={d.team} ppg={d.ppg} rank={(i + 1) as 1 | 2 | 3} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-display text-2xl mb-3">Last Week&apos;s Scores</h2>
          <ScoreStrip games={lastWeek} teamsById={data.teamsById} />
        </div>
      </section>
    </>
  );
}

function PreseasonEmptyState({ season }: { season: string }) {
  return (
    <>
      <LedHero>
        <div className="text-xs uppercase tracking-wider text-crimson-500">{season}</div>
        <h1 className="font-display text-5xl md:text-7xl mt-1">
          Coming <span className="text-crimson-500">Soon</span>
        </h1>
        <p className="mt-4 text-chrome-300">
          The {season} season hasn&apos;t started yet. Check back in September.
        </p>
      </LedHero>
    </>
  );
}

function Row({
  label, players, teamsById, headline, secondary,
}: {
  label: string;
  players: Player[];
  teamsById: Map<string, Team>;
  headline: (p: Player) => string;
  secondary: (p: Player) => string;
}) {
  if (players.length === 0) {
    return (
      <div>
        <h2 className="font-display text-2xl mb-3">{label}</h2>
        <p className="text-chrome-500 text-sm">No data yet.</p>
      </div>
    );
  }
  return (
    <div>
      <h2 className="font-display text-2xl mb-3">{label}</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {players.map((p, i) => (
          <TopPerformerCard
            key={p.id} player={p} team={teamsById.get(p.teamId)}
            headline={headline(p)} secondary={secondary(p)}
            rank={(i + 1) as 1 | 2 | 3}
          />
        ))}
      </div>
    </div>
  );
}
