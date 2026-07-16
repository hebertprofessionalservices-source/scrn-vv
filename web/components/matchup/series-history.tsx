import { formatGameDate } from "@/lib/format-date";
import type { Game, Team } from "@/lib/types";

/**
 * Series + coaching context for a matchup. Items that need all-time
 * historical data (AFHS) show n/a until that source is wired in.
 */
export function SeriesHistory({
  away,
  home,
  h2h,
}: {
  away: Team;
  home: Team;
  h2h: Game[];
}) {
  const finals = h2h
    .filter((g) => g.status === "final" && g.homeScore !== null && g.awayScore !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
  const last = finals[0] ?? null;

  const name = (id: string) =>
    id === away.id ? away.name : id === home.id ? home.name : id;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <section className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 p-5">
        <h2 className="font-display text-xl mb-3">Coaches</h2>
        <div className="space-y-3 text-sm">
          <CoachLine team={away} vs={home} />
          <CoachLine team={home} vs={away} />
          <div className="text-chrome-500">
            Coach vs coach: <span className="text-chrome-300">n/a</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 p-5">
        <h2 className="font-display text-xl mb-3">Series History</h2>
        <dl className="space-y-2 text-sm">
          <Item label="Last meeting">
            {last ? (
              <>
                {name(last.awayTeamId)} {last.awayScore} – {last.homeScore}{" "}
                {name(last.homeTeamId)}
                <span className="text-chrome-500">
                  {" "}· {formatGameDate(last.date)} · {last.venue ?? `at ${name(last.homeTeamId)}`}
                </span>
              </>
            ) : (
              "n/a"
            )}
          </Item>
          <Item label="First meeting">n/a</Item>
          <Item label="All-time series">n/a</Item>
          <Item label="Current series streak">n/a</Item>
          <Item label="Longest streak in series">n/a</Item>
        </dl>
      </section>
    </div>
  );
}

function CoachLine({ team, vs }: { team: Team; vs: Team }) {
  return (
    <div>
      <span className="font-display text-base">{team.name}:</span>{" "}
      <span className="text-chrome-100">{team.headCoach ?? "n/a"}</span>
      <div className="text-chrome-500">
        Record vs {vs.name}: <span className="text-chrome-300">n/a</span>
      </div>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="text-chrome-500 shrink-0">{label}:</dt>
      <dd className="text-chrome-100">{children}</dd>
    </div>
  );
}
