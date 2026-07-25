import { notFound } from "next/navigation";
import Link from "next/link";
import { loadDataset, loadPriorSeasonInfo, loadRankDeltas, currentSeason } from "@/lib/data-server";
import { RankDeltaChip } from "@/components/rank-delta";
import type { RankDelta } from "@/lib/rank-history";
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
import { buildRatings, matchupPlayoffOutlook, playoffPotentials, type MatchupOutlook } from "@/lib/standings";
import { buildTeamEfficiency } from "@/lib/efficiency";
import { runPassAttempts } from "@/lib/run-pass";
import { buildMatchupSide } from "@/lib/team-outlook";
import { matchupKeyLeaders } from "@/lib/game-leaders";
import { fmtPct, recordsBlockLines, type RecordsBlockInput } from "@/lib/matchup-format";
import { AiPick, KeyReturnersSection } from "@/components/matchup/key-returners";
import type { Team } from "@/lib/types";

// Storylines / Key Players / Coaches / Series History hidden from production
// until client revisions land. Flip to true to bring them back.
const SHOW_MATCHUP_EXTRAS = true;

/** The whole matchup view; `broadcast` renders it for on-air use. */
export async function MatchupFull({
  matchup,
  broadcast = false,
}: {
  matchup: string;
  broadcast?: boolean;
}) {
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
  const rate = buildRatings(data);
  const efficiency = buildTeamEfficiency(data);
  const prior = await loadPriorSeasonInfo(season);
  const priorYear = prior?.season.slice(0, 4) ?? null;
  const sideFor = (t: Team, rp: typeof runPass.a) =>
    buildMatchupSide(data, t, {
      rate,
      efficiency: efficiency.get(t.id) ?? null,
      runPass: rp,
      retOff: prior?.returningOffense.get(t.id) ?? null,
      retAll: prior?.returning.get(t.id) ?? null,
    });
  const sides = { a: sideFor(away, runPass.a), b: sideFor(home, runPass.b) };
  const keyLeaders = matchupKeyLeaders(
    data, away, home, h2h, prior?.returningPlayers ?? null,
  );
  const deltas = await loadRankDeltas(season, power);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Frozen like a header row: sticks below the site header on scroll. */}
      <div
        className={`sticky ${broadcast ? "top-0" : "top-24"} z-30 -mx-4 px-4 py-3 bg-navy-900/95 backdrop-blur border-b border-chrome-500/15`}
      >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center justify-end gap-3">
          <MatchupTeamHeader
            team={away}
            align="right"
            power={power.get(away.id) ?? null}
            playoffPct={potentials.get(away.id) ?? null}
            outlook={outlook?.a ?? null}
            records={sides.a.records}
            priorYear={priorYear}
            delta={deltas.get(away.id) ?? null}
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
            records={sides.b.records}
            priorYear={priorYear}
            delta={deltas.get(home.id) ?? null}
          />
        </div>
      </div>
      </div>

      <AiPick
        aName={away.name}
        bName={home.name}
        aRating={power.get(away.id)?.rating ?? null}
        bRating={power.get(home.id)?.rating ?? null}
      />

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

      <TaleOfTheTape a={away} b={home} runPass={runPass} sides={sides} />

      <KeyReturnersSection
        a={{ teamName: away.name, returners: prior?.keyReturners.get(away.id) ?? [] }}
        b={{ teamName: home.name, returners: prior?.keyReturners.get(home.id) ?? [] }}
      />

      {SHOW_MATCHUP_EXTRAS && (
        <KeyPlayers away={away} home={home} leaders={keyLeaders} />
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

      {!broadcast && (
        <Link
          href={`/present/matchup/${matchup}` as any}
          className="inline-block px-4 py-2 rounded-lg border border-crimson-500 text-crimson-500 font-display"
        >
          Broadcast →
        </Link>
      )}
    </main>
  );
}

function MatchupTeamHeader({
  team,
  align,
  power,
  playoffPct,
  outlook,
  records,
  priorYear,
  delta,
}: {
  team: Team;
  align: "left" | "right";
  power: PowerRank | null;
  playoffPct: number | null;
  outlook: MatchupOutlook | null;
  records: RecordsBlockInput;
  priorYear: string | null;
  delta: RankDelta | null;
}) {
  const rank = power && (
    <span className="font-display text-lg text-chrome-500 whitespace-nowrap">
      #{power.overallRank} <RankDeltaChip delta={delta?.overall} /> Overall - #{power.classRank}{" "}
      <RankDeltaChip delta={delta?.class} /> {classificationLabel(team.classification)}
      {power.source === "prior" && (
        <span className="text-sm text-chrome-500/80"> ({priorYear ?? "prior"})</span>
      )}
    </span>
  );
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className="text-xs text-chrome-500">
        {classRegionLabel(team)}
        {playoffPct !== null && ` (Current Playoff Potential: ${playoffPct.toFixed(2)}%)`}
      </div>
      <div className="font-display text-2xl xl:text-3xl leading-tight">
        {/* Name never wraps; sides mirror — rank sits VS-far on both. */}
        {align === "right" && rank && <>{rank} </>}
        <Link href={`/teams/${displaySlug(team)}` as any} className="whitespace-nowrap">
          {team.name}
        </Link>
        {align === "left" && rank && <> {rank}</>}
      </div>
      <div className="text-sm text-chrome-500">
        {recordsBlockLines(records).map((line) => (
          <div key={line}>{line}</div>
        ))}
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
