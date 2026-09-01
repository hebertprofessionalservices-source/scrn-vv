import "../../paper.css";
import "../../preview.css";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { currentSeason, loadDataset } from "@/lib/data-server";
import { loadHistory } from "@/lib/history-server";
import { buildPowerRankings } from "@/lib/power";
import { leagueOf, leagueWeek } from "@/lib/newspaper";
import {
  buildPreview,
  currentWeekRange,
  previewSides,
  slateDates,
  type Fixture,
} from "@/lib/preview";
import { classificationLabel } from "@/lib/team-format";
import { PaperStage } from "@/components/present/paper-stage";

/**
 * Newsprint-style week-ahead preview — the Recap's mirror image, built from the
 * same data and printed on the same 1920x1080 page so the two sit together in a
 * show package.
 *
 * Defaults to the Monday–Sunday week containing today; ?dates=, ?week= and
 * ?edition= override for building a preview ahead of time.
 *
 *   /present/preview/7A
 *   /present/preview/MAIS-4A?dates=2026-09-04&week=3
 */

const SPONSOR_SRC = "/brand/cspire-logo.png";
const SPONSOR_FILE = join(process.cwd(), "public", "brand", "cspire-logo.png");
const VV_MARK = "/brand/varsity-voices-square.png";

function leagueSeal(league: string): string | null {
  const file = league === "MAIS" ? "mais-logo.png" : "mhsaa-logo.png";
  return existsSync(join(process.cwd(), "public", "brand", file))
    ? `/brand/${file}`
    : null;
}

function downloadName(
  league: string,
  classification: string,
  week: string,
  dates: string[],
): string {
  const parts = [
    classification.toLowerCase().startsWith("mais") ? classification : `${league}-${classification}`,
    "preview",
    week ? `week${week}` : "",
    dates[0] ?? "",
  ].filter(Boolean);
  return parts.join("-").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];
const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

/** Headline date: the Monday the preview week opens, unless ?edition= says. */
function editionDate(monday: string, override?: string): string {
  const day = override || monday;
  if (!day) return "";
  const d = new Date(`${day}T12:00:00Z`);
  return `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function badgeClass(classification: string): string {
  return classification.replace(/^MAIS-/, "").replace(/^8M-/, "8M ");
}

function Crest({ src, className }: { src: string | null; className: string }) {
  if (!src) return <div className={`${className}--blank`} aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={src} alt="" />;
}

function seed(rank: number | null) {
  return rank === null ? null : <span className="board__seed">No. {rank} </span>;
}

function capTeam(school: string, rank: number | null): string {
  return rank === null ? school : `${school} — No. ${rank}`;
}

/**
 * One sentence on what the matchup promises, built only from facts in the
 * data — the projected favourite, the series, or a region stake.
 */
function previewSub(f: Fixture): string {
  const favSchool =
    f.favored === "home" ? f.homeSchool : f.favored === "away" ? f.awaySchool : null;
  if (favSchool && f.favoredPct !== null) {
    const pct = Math.round(f.favoredPct * 100);
    if (pct <= 55) return `Ratings split it — ${favSchool} by a hair, ${pct}%.`;
    return `${favSchool} projects ahead at ${pct}%.`;
  }
  if (f.meetings >= 5) return `The ${f.meetings}th meeting in a long-running series.`;
  if (f.region) return `A region game with seeding on the line.`;
  return `${f.awaySchool} at ${f.homeSchool}, ${f.day}.`;
}

/** Headline chosen from the shape of the lead matchup, never invented. */
function headlineFor(f: Fixture | undefined): string {
  if (!f) return "THE WEEK AHEAD";
  const bothRanked = f.homeRank !== null && f.awayRank !== null;
  const bothTop5 = bothRanked && f.homeRank! <= 5 && f.awayRank! <= 5;
  if (bothTop5) return "TOP-FIVE COLLISION";
  if (bothRanked && f.ratingGap !== null && f.ratingGap <= 3) return "TOO CLOSE TO CALL";
  if (bothRanked) return "RANKED AND READY";
  if (f.meetings >= 10) return "OLD SCORES TO SETTLE";
  if (f.region) return "REGION ON THE LINE";
  return "THE WEEK AHEAD";
}

export default async function PreviewPaper({
  params,
  searchParams,
}: {
  params: Promise<{ classification: string }>;
  searchParams: Promise<{ dates?: string; week?: string; edition?: string }>;
}) {
  const { classification: raw } = await params;
  const sp = await searchParams;
  const classification = decodeURIComponent(raw);

  const season = await currentSeason();
  const [data, history] = await Promise.all([loadDataset(season), loadHistory()]);
  const league = leagueOf(classification);

  const today = new Date().toISOString().slice(0, 10);
  const [monday, sunday] = currentWeekRange(today);
  const override = (sp.dates ?? "").split(",").map((d) => d.trim()).filter(Boolean);
  const dates = override.length > 0 ? override : slateDates(data.games, [monday, sunday]);
  const autoWeek = dates.length > 0 ? leagueWeek(season, league, dates[0]) : null;
  const week = sp.week ?? (autoWeek !== null ? String(autoWeek) : "");

  const sponsor = existsSync(SPONSOR_FILE);
  const seal = leagueSeal(league);
  const ranks = buildPowerRankings(data);
  const preview = buildPreview(data, ranks, history, { classification, dates });
  const heroes = preview.headliners;
  const watch = preview.watch.slice(0, 4);

  if (preview.fixtures.length === 0) {
    return (
      <PaperStage backHref="/present/preview" backLabel="← All previews">
        <div className="paper">
          <p className="paper__empty">
            No scheduled games found for {classificationLabel(classification)} in{" "}
            {dates.join(", ") || `${monday} – ${sunday}`}. Add
            ?dates=YYYY-MM-DD to pick a different week.
          </p>
        </div>
      </PaperStage>
    );
  }

  return (
    <PaperStage
      fileName={downloadName(league, classification, week, dates)}
      backHref="/present/preview"
      backLabel="← All previews"
    >
      <div className="paper">
        <div className="paper__topbar">
          <span>{editionDate(monday, sp.edition)}</span>
          <span>Your #1 Source for All Things Mississippi High School Football</span>
          <span>Section B</span>
        </div>
        <div className="paper__rule" />

        <div className="paper__mastwrap">
          <div className="paper__sponsor">
            {sponsor ? (
              <>
                <span className="paper__sponsor-label">Presented by</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SPONSOR_SRC} alt="C Spire" className="paper__sponsor-img" />
              </>
            ) : null}
          </div>
          <div className="paper__masthead">VARSITY VOICES</div>
          <div className="paper__badge">
            <span>{league}</span>
            <b>{badgeClass(classification)}</b>
            <small>FOOTBALL</small>
          </div>
        </div>
        <div className="paper__tagline">Covering high school sports across the Magnolia State</div>
        <div className="paper__rule" />

        <div className="paper__lede">
          <div className="paper__kicker">
            ★ {league} {week ? `WEEK ${week}` : "THIS WEEK"} PREVIEW ★
          </div>
          <div className="paper__headline">{headlineFor(heroes[0])}</div>
          <div className="paper__deck">
            {heroes.map((h) => `${h.awaySchool} at ${h.homeSchool}.`).join(" ")}
          </div>
          {seal ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={seal} alt={`${league} logo`} className="paper__seal" />
          ) : null}
        </div>

        <div className="paper__body">
          <div className="paper__left">
            <div className="paper__heroes">
              {heroes.map((h) => {
                const { lead, foe } = previewSides(h);
                return (
                  <div className="hero" key={h.game.id}>
                    <div className="hero__frame">
                      {/* No score to print yet — crests either side of a VS. */}
                      <div className="hero__score">
                        <Crest src={lead.logo} className="hero__logoimg" />
                        <span className="hero__vs">VS</span>
                        <Crest src={foe.logo} className="hero__logoimg" />
                      </div>
                      <div className="hero__names">
                        <span>{lead.school}</span>
                        <span>{foe.school}</span>
                      </div>
                    </div>
                    <div className="hero__cap">
                      <div className="hero__capline">
                        <span className="hero__capscore">{lead.record}</span>
                        <span>{capTeam(lead.school, lead.rank)}</span>
                      </div>
                      <div className="hero__capline hero__capline--foe">
                        <span className="hero__capscore">{foe.record}</span>
                        <span>{capTeam(foe.school, foe.rank)}</span>
                      </div>
                    </div>
                    <div className="hero__sub">{previewSub(h)}</div>
                  </div>
                );
              })}
            </div>

            <div className="paper__modules">
              <div className="mod">
                <div className="mod__head">Form Guide</div>
                {preview.notes.map((n) => (
                  <div className="note" key={n.label}>
                    <Crest src={n.logo} className="note__img" />
                    <div>
                      <b>{n.label}</b>
                      <span>{n.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mod">
                <div className="mod__head">Also This Week</div>
                {preview.fixtures
                  .filter((f) => !heroes.includes(f))
                  .slice(0, 5)
                  .map((f) => (
                    <div className="note" key={f.game.id}>
                      <div>
                        <span>
                          {f.awaySchool} at {f.homeSchool}, {f.day}.
                        </span>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="mod">
                <div className="mod__head">Players to Watch</div>
                {/* Always four cells in a 2x2 — season stats are published by
                    each school, so a class can genuinely yield three namable
                    leaders or fewer; the house mark fills the gap. */}
                <div className="players">
                  {Array.from({ length: 4 }, (_, i) => watch[i]).map((p, i) =>
                    p ? (
                      <div className="player" key={p.name + p.school}>
                        <div className="player__top">
                          <Crest src={p.logo} className="player__logoimg" />
                          <span>{p.school}</span>
                        </div>
                        <div className="player__name">{p.name}</div>
                        <div className="player__line">{p.line}</div>
                      </div>
                    ) : (
                      <div className="player player--filler" key={`filler-${i}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={VV_MARK} alt="" />
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="paper__right">
            <div className="board__head">
              {/* Kickoff times are not in the data — only the date. */}
              <span>Top {preview.board.length} This Week</span>
              <span>Day</span>
            </div>
            {preview.board.map((f, i) => {
              const { lead, foe } = previewSides(f);
              return (
                <div className="board__row" key={f.game.id}>
                  <span className="board__rank">{i + 1}</span>
                  <Crest src={lead.logo} className="board__logo" />
                  <span className="board__teams">
                    <b>
                      {seed(lead.rank)}
                      {lead.school}
                    </b>
                    <i>
                      vs {seed(foe.rank)}
                      {foe.school}
                    </i>
                  </span>
                  <Crest src={foe.logo} className="board__logo" />
                  <span className="board__day">{f.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="paper__foot">
          <span>Varsity Voices</span>
          <span>Your home for Mississippi high school football · Watch · Listen · Follow</span>
          <span className="url">VarsityVoices.com</span>
          <div className="paper__footslot" />
        </div>
      </div>
    </PaperStage>
  );
}
