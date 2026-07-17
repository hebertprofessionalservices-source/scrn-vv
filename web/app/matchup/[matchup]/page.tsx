import { notFound } from "next/navigation";
import Link from "next/link";
import { loadDataset, currentSeason } from "@/lib/data-server";
import { TaleOfTheTape } from "@/components/matchup/tale-of-the-tape";
import { FormGuide } from "@/components/matchup/form-guide";
import { SeriesHistory } from "@/components/matchup/series-history";
import { KeyPlayers } from "@/components/matchup/key-players";
import { buildStorylines } from "@/lib/storylines";
import { loadHistory } from "@/lib/history-server";
import { buildMatchupHistory } from "@/lib/matchup-history";
import { TeamLogo } from "@/components/brand/team-logo";
import { displaySlug } from "@/lib/display-slug";
import { classificationLabel, classRegionLabel } from "@/lib/team-format";
import { formatGameDate } from "@/lib/format-date";
import { buildPowerRankings, type PowerRank } from "@/lib/power";
import { matchupPlayoffOutlook, playoffPotentials, type MatchupOutlook } from "@/lib/standings";
import { runPassAttempts } from "@/lib/run-pass";
import { fmtPct, recordSplitsLabel } from "@/lib/matchup-format";
import type { Team } from "@/lib/types";

// Storylines / Key Players / Coaches / Series History hidden from production
// until client revisions land. Flip to true to bring them back.
const SHOW_MATCHUP_EXTRAS = true;

export default async function MatchupPage({ params }: { params: Promise<{ matchup: string }> }) {
  const { matchup } = await params;
  const season = await currentSeason();
  const data = await loadDataset(season);
  const m = matchup.match(/^(.+)-vs-(.+)$/);
  if (!m) notFound();
  const away = data.teamsBySlug.get(m[1]);
  const home = data.teamsBySlug.get(m[2]);
  if (!away || !home) notFound();

  const awayGames = data.gamesByTeam.get(away.id) ?? [];
  const homeGames = data.gamesByTeam.get(home.id) ?? [];
  const h2h = awayGames.filter((g) =>
    g.homeTeamId === home.id || g.awayTeamId === home.id);
  const history = await loadHistory();
  const historyView = buildMatchupHistory(history, away, home, Number(season.slice(0, 4)));
  const storylines = [
    ...buildStorylines(data, away, home, h2h),
    ...historyView.milestones,
  ].slice(0, 8);

  const power = buildPowerRankings(data);
  const potentials = playoffPotentials(data);
  const outlook = matchupPlayoffOutlook(data, away.id, home.id);
  const runPass = {
    a: runPassAttempts(data.playersByTeam.get(away.id) ?? []),
    b: runPassAttempts(data.playersByTeam.get(home.id) ?? []),
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center justify-end gap-3">
          <MatchupTeamHeader
            team={away}
            align="right"
            power={power.get(away.id) ?? null}
            playoffPct={potentials.get(away.id) ?? null}
            outlook={outlook?.a ?? null}
          />
          <TeamLogo src={away.logoUrl} size={64} />
        </div>
        <div className="font-display text-5xl text-crimson-500">VS</div>
        <div className="flex items-center gap-3">
          <TeamLogo src={home.logoUrl} size={64} />
          <MatchupTeamHeader
            team={home}
            align="left"
            power={power.get(home.id) ?? null}
            playoffPct={potentials.get(home.id) ?? null}
            outlook={outlook?.b ?? null}
          />
        </div>
      </div>

      {SHOW_MATCHUP_EXTRAS && storylines.length > 0 && (
        <section className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 p-5">
          <h2 className="font-display text-xl mb-3">Storylines</h2>
          <ul className="space-y-2 text-sm">
            {storylines.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-crimson-500 shrink-0">—</span>
                <span className="text-chrome-100">{line}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <TaleOfTheTape a={away} b={home} runPass={runPass} />

      {SHOW_MATCHUP_EXTRAS && (
        <KeyPlayers away={away} home={home} playersByTeam={data.playersByTeam} />
      )}

      {SHOW_MATCHUP_EXTRAS && (
        <SeriesHistory away={away} home={home} h2h={h2h} view={historyView} />
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <h2 className="font-display text-xl mb-2">{away.name} — Last 5</h2>
          <FormGuide teamId={away.id} games={awayGames} />
        </section>
        <section>
          <h2 className="font-display text-xl mb-2">{home.name} — Last 5</h2>
          <FormGuide teamId={home.id} games={homeGames} />
        </section>
      </div>

      {h2h.length > 0 && (
        <section>
          <h2 className="font-display text-xl mb-2">Head-to-Head</h2>
          <ul className="space-y-1 text-sm">
            {h2h.map((g) => (
              <li key={g.id} className="text-chrome-300">
                {formatGameDate(g.date)}: {g.awayScore} – {g.homeScore}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href={`/present/matchup/${matchup}` as any}
        className="inline-block px-4 py-2 rounded-lg border border-crimson-500 text-crimson-500 font-display"
      >
        Open in broadcast mode →
      </Link>
    </main>
  );
}

function MatchupTeamHeader({
  team,
  align,
  power,
  playoffPct,
  outlook,
}: {
  team: Team;
  align: "left" | "right";
  power: PowerRank | null;
  playoffPct: number | null;
  outlook: MatchupOutlook | null;
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className="text-xs text-chrome-500">
        {classRegionLabel(team)}
        {playoffPct !== null && ` (Current Playoff Potential: ${playoffPct.toFixed(2)}%)`}
      </div>
      <div className="font-display text-3xl leading-tight">
        <Link href={`/teams/${displaySlug(team)}` as any}>{team.name}</Link>
        {power && (
          <span className="font-display text-lg text-chrome-500 whitespace-nowrap">
            {" "}#{power.overallRank} Overall - #{power.classRank}{" "}
            {classificationLabel(team.classification)}
          </span>
        )}
      </div>
      <div className="text-sm text-chrome-500">
        {recordSplitsLabel(team.record, {
          home: team.homeRecord ?? null,
          away: team.awayRecord ?? null,
          neutral: team.neutralRecord ?? null,
          region: team.regionRecord ?? null,
        })}
      </div>
      {outlook && (outlook.ifWin !== null || outlook.ifLoss !== null) && (
        <div className="text-sm text-chrome-500">
          Playoff Potential if win/loss:{" "}
          <span className="text-chrome-300">
            {fmtPct(outlook.ifWin)} / {fmtPct(outlook.ifLoss)}
          </span>
        </div>
      )}
    </div>
  );
}
