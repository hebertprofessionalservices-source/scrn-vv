import { loadDataset, loadEditorial, currentSeason } from "@/lib/data-server";
import { GameOfTheWeekCard } from "@/components/cards/game-of-the-week-card";
import { buildScoreCards } from "@/lib/scores";
import { UpsetList } from "@/components/home/upset-list";
import { HomeLeaderboards } from "@/components/home/home-leaderboards";
import { HomePerformances } from "@/components/home/home-performances";
import { buildEditorialContext } from "@/lib/editorial";
import { buildLeaderboardData } from "@/lib/leaderboard";
import { buildPowerRankings } from "@/lib/power";
import { buildWeeklyView } from "@/lib/weekly";
import { lastWeeksGames, seasonConcluded } from "@/lib/stats";
import { buildUpsets } from "@/lib/upsets";

// Weekly performances + outstanding performances hidden from production
// until client review. Flip to true to bring them back.
const SHOW_WEEKLY_FEATURES = true;

// Biggest Upsets (per league, previous week) — built and tested, held back
// for a later release. Flip to true to bring them back: the cards return to
// the top row above each Game of the Week.
const SHOW_UPSETS: boolean = false;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ asof?: string }>;
}) {
  const { asof } = await searchParams;
  const season = await currentSeason();
  const data = await loadDataset(season);
  const editorial = await loadEditorial();
  const ctx = buildEditorialContext(editorial, data.games, data.teams, buildPowerRankings(data));

  if (data.teams.length === 0) {
    return <PreseasonEmptyState season={season} />;
  }

  const leaderboards = buildLeaderboardData(data.teams, data.players);
  // ?asof=YYYY-MM-DD replays the season as of a past date (testing aid).
  const weekly = buildWeeklyView(data, asof);

  // Flattened here so the client-side league/class filter can narrow the strip.
  const scores = buildScoreCards(lastWeeksGames(data.games), data.teamsById);
  const mhsaaUpsets = SHOW_UPSETS ? buildUpsets(data, "MHSAA") : [];
  const maisUpsets = SHOW_UPSETS ? buildUpsets(data, "MAIS") : [];

  const hostGame = ctx.hostPickGame;
  const { mhsaa: mhsaaGame, mais: maisGame } = ctx.algorithmPicks;

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

      {/* Host's pick moves above the grid only when the upset cards are
          showing, so the grid below stays a clean 2x2. */}
      {hostGame && SHOW_UPSETS && (
        <section className="max-w-7xl mx-auto px-4 pt-8">
          <GameOfTheWeekCard
            game={hostGame}
            away={data.teamsById.get(hostGame.awayTeamId)}
            home={data.teamsById.get(hostGame.homeTeamId)}
            label={`Host's Pick · ${editorial?.gameOfTheWeek?.pickedBy ?? ""}`}
            storyline={editorial?.gameOfTheWeek?.storyline ?? ""}
          />
        </section>
      )}

      {/*
        With upsets on this is a 2x2 grid — upsets across the top row, Game of
        the Week beneath — so each pair is the same height. Explicit row/column
        placement (rather than source order) keeps the DOM in mobile reading
        order, each league's upsets directly above its own game. With upsets
        off it collapses to the original single row of Game of the Week cards.
      */}
      <section
        className={
          SHOW_UPSETS
            ? "max-w-7xl mx-auto px-4 py-8 grid gap-6 md:grid-cols-2 md:grid-rows-[auto_1fr]"
            : "max-w-7xl mx-auto px-4 py-8 grid gap-6 md:grid-cols-2"
        }
      >
        {hostGame && !SHOW_UPSETS && (
          <GameOfTheWeekCard
            game={hostGame}
            away={data.teamsById.get(hostGame.awayTeamId)}
            home={data.teamsById.get(hostGame.homeTeamId)}
            label={`Host's Pick · ${editorial?.gameOfTheWeek?.pickedBy ?? ""}`}
            storyline={editorial?.gameOfTheWeek?.storyline ?? ""}
          />
        )}
        {mhsaaGame && (
          <>
            {SHOW_UPSETS && (
              <div className="min-w-0 md:col-start-1 md:row-start-1">
                <UpsetList league="MHSAA" upsets={mhsaaUpsets} />
              </div>
            )}
            <div className={SHOW_UPSETS ? "min-w-0 md:col-start-1 md:row-start-2" : "min-w-0"}>
              <GameOfTheWeekCard
                game={mhsaaGame}
                away={data.teamsById.get(mhsaaGame.awayTeamId)}
                home={data.teamsById.get(mhsaaGame.homeTeamId)}
                label="MHSAA Game of the Week"
                storyline="Top-ranked teams + tight matchup score."
              />
            </div>
          </>
        )}
        {maisGame && (
          <>
            {SHOW_UPSETS && (
              <div className="min-w-0 md:col-start-2 md:row-start-1">
                <UpsetList league="MAIS" upsets={maisUpsets} />
              </div>
            )}
            <div className={SHOW_UPSETS ? "min-w-0 md:col-start-2 md:row-start-2" : "min-w-0"}>
              <GameOfTheWeekCard
                game={maisGame}
                away={data.teamsById.get(maisGame.awayTeamId)}
                home={data.teamsById.get(maisGame.homeTeamId)}
                label="MAIS Game of the Week"
                storyline="Top-ranked teams + tight matchup score."
              />
            </div>
          </>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 space-y-8 pb-12">
        {/* Last week's scores live inside these so they share the filter. */}
        {SHOW_WEEKLY_FEATURES ? (
          <HomePerformances leaderboards={leaderboards} weekly={weekly} scores={scores} />
        ) : (
          <HomeLeaderboards data={leaderboards} scores={scores} />
        )}
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
