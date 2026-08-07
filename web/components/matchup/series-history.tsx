import { formatGameDate } from "@/lib/format-date";
import { fmtWLT, type CoachView, type MatchupHistoryView } from "@/lib/matchup-history";
import type { Meeting } from "@/lib/history";
import type { Game, Team } from "@/lib/types";

/**
 * Series + coaching context for a matchup, backed by AFHS historical data
 * (ahsfhs.org). Items the history doesn't cover show n/a.
 */
export function SeriesHistory({
  away,
  home,
  h2h,
  view,
}: {
  away: Team;
  home: Team;
  h2h: Game[];
  view: MatchupHistoryView;
}) {
  const s = view.series;

  // Fall back to this season's dataset for the last meeting when AFHS has
  // no series (e.g. unmatched school).
  const finals = h2h
    .filter((g) => g.status === "final" && g.homeScore !== null && g.awayScore !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
  const seasonLast = finals[0] ?? null;
  const name = (id: string) =>
    id === away.id ? away.name : id === home.id ? home.name : id;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <section className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 p-5">
        <h2 className="font-display text-xl mb-3">Coaches</h2>
        <div className="space-y-4 text-sm">
          <CoachLine view={view.coaches[0]} vsName={home.name} />
          <CoachLine view={view.coaches[1]} vsName={away.name} />
          <div className="text-chrome-500">
            Coach vs coach:{" "}
            <span className="text-chrome-100">
              {view.coachVsCoach
                ? `${view.coachVsCoach.aName} ${view.coachVsCoach.aWins}–${view.coachVsCoach.bWins}` +
                  (view.coachVsCoach.ties ? `–${view.coachVsCoach.ties}` : "") +
                  ` ${view.coachVsCoach.bName}`
                : "n/a"}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 p-5">
        <h2 className="font-display text-xl mb-3">Series History</h2>
        <dl className="space-y-2 text-sm">
          <Item label="All-time series">
            {s
              ? `${s.schoolA} ${s.aWins}–${s.bWins}${s.ties ? `–${s.ties}` : ""} ${s.schoolB} (${s.aWins + s.bWins + s.ties} meetings)`
              : "n/a"}
          </Item>
          <Item label="Last meeting">
            {s ? (
              <MeetingLine m={s.last} a={s.schoolA} b={s.schoolB} />
            ) : seasonLast ? (
              <>
                {name(seasonLast.awayTeamId)} {seasonLast.awayScore} – {seasonLast.homeScore}{" "}
                {name(seasonLast.homeTeamId)}
                <span className="text-chrome-500">
                  {" "}· {formatGameDate(seasonLast.date)}
                </span>
              </>
            ) : (
              "n/a"
            )}
          </Item>
          <Item label="First meeting">
            {s ? <MeetingLine m={s.first} a={s.schoolA} b={s.schoolB} /> : "n/a"}
          </Item>
          <Item label="Current series streak">
            {s?.currentStreak
              ? `${s.currentStreak.school} has won ${s.currentStreak.count} straight (${yearsSpan(s.currentStreak.startYear, s.currentStreak.endYear)})`
              : "n/a"}
          </Item>
          <Item label="Longest streak in series">
            {s?.longestStreak
              ? `${s.longestStreak.school}, ${s.longestStreak.count} straight (${yearsSpan(s.longestStreak.startYear, s.longestStreak.endYear)})`
              : "n/a"}
          </Item>
          {s?.mostAllowedByA && s?.mostAllowedByB && (
            <Item label="Most points allowed">
              {s.schoolA}: {s.mostAllowedByA.points} ({s.mostAllowedByA.year}) ·{" "}
              {s.schoolB}: {s.mostAllowedByB.points} ({s.mostAllowedByB.year})
            </Item>
          )}
        </dl>
        {s && (
          <p className="mt-3 text-xs text-chrome-500">
            Historical data via ahsfhs.org (~88% of all-time games on record)
          </p>
        )}
      </section>
    </div>
  );
}

function MeetingLine({ m, a, b }: { m: Meeting; a: string; b: string }) {
  return (
    <>
      {a} {m.aScore} – {m.bScore} {b}
      <span className="text-chrome-500">
        {" "}· {m.year}
        {m.date ? ` (${m.date.replace(/^\w{3}\.,\s*/, "")})` : ""} · at {m.host}
        {m.playoff ? ` · ${m.playoff}` : ""}
      </span>
    </>
  );
}

function yearsSpan(start: number, end: number): string {
  return start === end ? String(start) : `${start}–${end}`;
}

function CoachLine({ view, vsName }: { view: CoachView; vsName: string }) {
  const c = view.summary;
  const displayName = c?.name ?? view.fallbackName;
  if (!displayName) return null;
  return (
    <div>
      <span className="font-display text-base">{view.teamName}:</span>{" "}
      <span className="text-chrome-100">{displayName}</span>
      <div className="text-chrome-500 text-xs mt-0.5 space-x-3">
        <span>Years at school: <span className="text-chrome-300">{c ? c.yearsAtSchool : "n/a"}</span></span>
        <span>At school: <span className="text-chrome-300">{c ? fmtWLT(c.atSchool) : "n/a"}</span></span>
        <span>Career: <span className="text-chrome-300">{c ? fmtWLT(c.career) : "n/a"}</span></span>
      </div>
      <div className="text-chrome-500 text-xs mt-0.5">
        Record vs {vsName}:{" "}
        <span className="text-chrome-300">
          {view.vsOpponent ? fmtWLT(view.vsOpponent) : "n/a"}
        </span>
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
