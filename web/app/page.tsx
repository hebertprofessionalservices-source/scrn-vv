import { loadDataset, loadEditorial, currentSeason } from "@/lib/data-server";
import { GameOfTheWeekCard } from "@/components/cards/game-of-the-week-card";
import { ScoreStrip } from "@/components/cards/score-strip";
import { HomeLeaderboards } from "@/components/home/home-leaderboards";
import { HomePerformances, OutstandingPerformances } from "@/components/home/home-performances";
import { buildEditorialContext } from "@/lib/editorial";
import { buildLeaderboardData } from "@/lib/leaderboard";
import { buildWeeklyView } from "@/lib/weekly";
import { lastWeeksGames, seasonConcluded } from "@/lib/stats";

// Weekly performances + outstanding performances hidden from production
// until client review. Flip to true to bring them back.
const SHOW_WEEKLY_FEATURES = true;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ asof?: string }>;
}) {
  const { asof } = await searchParams;
  const season = await currentSeason();
  const data = await loadDataset(season);
  const editorial = await loadEditorial();
  const ctx = buildEditorialContext(editorial, data.games, data.teams);

  if (data.teams.length === 0) {
    return <PreseasonEmptyState season={season} />;
  }

  const leaderboards = buildLeaderboardData(data.teams, data.players);
  // ?asof=YYYY-MM-DD replays the season as of a past date (testing aid).
  const weekly = buildWeeklyView(data, asof);

  const lastWeek = lastWeeksGames(data.games);

  const hostGame = ctx.hostPickGame;
  const algoGame = ctx.algorithmPickGame;

  const concluded = seasonConcluded(data.games);
  const currentWeek = editorial?.currentWeek ?? 0;

  return (
    <>
      <LedPageBackground />
      <section className="relative max-w-7xl mx-auto px-4 py-8">
        {!concluded && currentWeek > 0 && (
          <div className="text-xs uppercase tracking-wider text-crimson-500 mb-3">
            Week {currentWeek}
          </div>
        )}
        <h1 className="sr-only">Varsity Voices — Mississippi HS Football</h1>
        {editorial?.featuredQuote && (
          <p className="mt-4 italic text-chrome-300">&ldquo;{editorial.featuredQuote}&rdquo;</p>
        )}
      </section>

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
        {SHOW_WEEKLY_FEATURES ? (
          <>
            <HomePerformances leaderboards={leaderboards} weekly={weekly} />
            <OutstandingPerformances weekly={weekly} />
          </>
        ) : (
          <HomeLeaderboards data={leaderboards} />
        )}

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
      <LedPageBackground />
      <section className="relative max-w-7xl mx-auto px-4 py-12">
        <div className="text-xs uppercase tracking-wider text-crimson-500">{season}</div>
        <h1 className="font-display text-5xl md:text-7xl mt-1">
          Coming <span className="text-crimson-500">Soon</span>
        </h1>
        <p className="mt-4 text-chrome-300">
          The {season} season hasn&apos;t started yet. Check back in September.
        </p>
      </section>
    </>
  );
}

/** Full-viewport LED dot background pinned behind the home page content. */
function LedPageBackground() {
  return (
    <>
      <div className="fixed inset-0 -z-10 bg-led-dots" aria-hidden />
      <div className="fixed inset-0 -z-10 bg-navy-900/80" aria-hidden />
    </>
  );
}
