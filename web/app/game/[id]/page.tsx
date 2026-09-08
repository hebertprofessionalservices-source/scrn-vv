import { notFound } from "next/navigation";
import Link from "next/link";
import { loadDataset, currentSeason } from "@/lib/data-server";
import { buildBoxScore, type BoxLine, type BoxSide } from "@/lib/box-score";
import { TeamLogo } from "@/components/brand/team-logo";
import { classificationLabel } from "@/lib/team-format";
import { formatGameDate } from "@/lib/format-date";

/**
 * One game's box score — the recap show's page for diving into a single
 * result. Reached from a final on the Schedules page or from the matchup's
 * head-to-head list.
 */
export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const season = await currentSeason();
  const data = await loadDataset(season);

  const game = data.games.find((g) => g.id === decodeURIComponent(id));
  if (!game) notFound();
  const box = buildBoxScore(data, game);
  if (!box) notFound();

  const { away, home } = box;
  const periods = Math.max(away.quarters.length, home.quarters.length);
  const matchupHref =
    away.team && home.team ? `/matchup?a=${away.team.id}&b=${home.team.id}` : null;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <Link
        href={"/upcoming" as any}
        className="inline-flex items-center gap-1 text-sm text-chrome-500 hover:text-crimson-500"
      >
        ← Back to Schedules
      </Link>

      <section className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 p-6 !mt-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <TeamSide side={away} align="right" won={away.score > home.score} />
          <div className="text-center">
            <div className="font-display text-4xl">
              <span className={away.score > home.score ? "" : "text-chrome-500"}>
                {away.score}
              </span>
              <span className="text-chrome-500 mx-2">–</span>
              <span className={home.score > away.score ? "" : "text-chrome-500"}>
                {home.score}
              </span>
            </div>
            <div className="text-xs uppercase tracking-wider text-chrome-500 mt-1">Final</div>
          </div>
          <TeamSide side={home} align="left" won={home.score > away.score} />
        </div>
        <p className="text-sm text-chrome-500 text-center mt-4">
          {formatGameDate(game.date)}
          {game.venue ? ` · ${game.venue}` : ""}
        </p>
      </section>

      {periods > 0 && (
        <section>
          <h2 className="font-display text-2xl mb-3">Scoring by Quarter</h2>
          <div className="rounded-xl border border-chrome-500/15 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-navy-700/50 text-chrome-500 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Team</th>
                  {Array.from({ length: periods }, (_, i) => (
                    <th key={i} className="px-3 py-2 text-right">
                      {i < 4 ? i + 1 : `OT${i - 3}`}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right">Final</th>
                </tr>
              </thead>
              <tbody>
                {[away, home].map((s) => (
                  <tr key={s.name} className="border-t border-chrome-500/10">
                    <td className="px-3 py-2">{s.name}</td>
                    {Array.from({ length: periods }, (_, i) => (
                      <td key={i} className="px-3 py-2 text-right text-chrome-300">
                        {s.quarters[i] ?? "—"}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-display">{s.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {box.hasStats ? (
        <section>
          <h2 className="font-display text-2xl mb-3">Box Score</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <TeamBox side={away} />
            <TeamBox side={home} />
          </div>
          {box.unattributed > 0 && (
            <p className="text-xs text-chrome-500 mt-3">
              {box.unattributed} stat {box.unattributed === 1 ? "line" : "lines"} could not be
              matched to a roster player and {box.unattributed === 1 ? "is" : "are"} not shown.
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-chrome-500/15 p-8 text-center">
          <p className="font-display text-xl mb-1">No box score for this game</p>
          <p className="text-chrome-500 text-sm">
            Individual stats are entered by each team&apos;s own coaching staff, and
            this one hasn&apos;t been filled in.
          </p>
        </section>
      )}

      {matchupHref && (
        <Link
          href={matchupHref as any}
          className="inline-block px-4 py-2 rounded-lg border border-crimson-500 text-crimson-500 font-display"
        >
          Full match up →
        </Link>
      )}
    </main>
  );
}

function TeamSide({
  side,
  align,
  won,
}: {
  side: BoxSide;
  align: "left" | "right";
  won: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 ${align === "right" ? "justify-end" : ""}`}
    >
      {align === "left" && <TeamLogo src={side.logo} size={56} />}
      <div className={align === "right" ? "text-right" : "text-left"}>
        <div className={`font-display text-2xl leading-tight ${won ? "" : "text-chrome-300"}`}>
          {side.team ? (
            <Link href={`/teams/${side.team.id}` as any} className="hover:text-crimson-500">
              {side.name}
            </Link>
          ) : (
            side.name
          )}
        </div>
        {side.team && (
          <div className="text-xs text-chrome-500">
            {classificationLabel(side.team.classification)}
          </div>
        )}
      </div>
      {align === "right" && <TeamLogo src={side.logo} size={56} />}
    </div>
  );
}

function TeamBox({ side }: { side: BoxSide }) {
  const { stats } = side;
  return (
    <div className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 p-5">
      <h3 className="font-display text-lg mb-1">{side.name}</h3>
      <p className="text-xs text-chrome-500 mb-4">
        {stats.passYds.toLocaleString()} pass · {stats.rushYds.toLocaleString()} rush ·{" "}
        {(stats.passYds + stats.rushYds).toLocaleString()} total yards
      </p>
      <LineGroup label="Passing" lines={stats.passing} />
      <LineGroup label="Rushing" lines={stats.rushing} className="mt-4" />
      <LineGroup label="Receiving" lines={stats.receiving} className="mt-4" />
      <LineGroup label="Defense" lines={stats.defense} className="mt-4" />
    </div>
  );
}

function LineGroup({
  label,
  lines,
  className = "",
}: {
  label: string;
  lines: BoxLine[];
  className?: string;
}) {
  if (lines.length === 0) return null;
  return (
    <div className={className}>
      <div className="text-xs uppercase tracking-wider text-chrome-500 mb-2">{label}</div>
      <div className="divide-y divide-chrome-500/10">
        {lines.map((l) => {
          const inner = (
            <>
              <span className="text-sm text-chrome-100">{l.name}</span>
              <span className="text-xs text-chrome-300 text-right">{l.line}</span>
            </>
          );
          const cls = "flex items-baseline justify-between gap-3 py-1.5";
          return l.playerId ? (
            <Link key={l.name + l.line} href={`/players/${l.playerId}` as any} className={`${cls} hover:text-crimson-500`}>
              {inner}
            </Link>
          ) : (
            <div key={l.name + l.line} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
