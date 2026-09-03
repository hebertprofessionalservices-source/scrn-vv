import "../../paper.css";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { currentSeason, loadDataset } from "@/lib/data-server";
import { buildPowerRankings } from "@/lib/power";
import {
  buildNewspaper,
  latestSlate,
  leagueOf,
  leagueWeek,
  scoreboardSides,
  type Contest,
  type Performance,
} from "@/lib/newspaper";
import { classificationLabel } from "@/lib/team-format";
import { PaperStage } from "@/components/present/paper-stage";


/**
 * Newsprint-style weekly recap, built entirely from scraped data.
 *
 * Fixed at 1920x1080 so a browser screenshot is a ready-to-post 16:9 graphic.
 * Every score, stat line and logo comes from games.json / teams.json, so the
 * page is correct by construction — no transcription, and real team crests
 * instead of an image model's impression of them.
 *
 * Defaults to the most recent completed slate and that league's own week
 * number; ?dates=, ?week= and ?edition= override for reprinting an older week.
 *
 *   /present/newspaper/7A
 *   /present/newspaper/MAIS-4A?dates=2026-08-27,2026-08-28&week=3
 */

/**
 * Presenting sponsor mark, mirroring the class badge across the nameplate.
 * Rendered only when the file is actually present — an empty slot keeps the
 * masthead centred, where a broken image would sit there as a torn icon.
 */
const SPONSOR_SRC = "/brand/cspire-logo.png";
const SPONSOR_FILE = join(process.cwd(), "public", "brand", "cspire-logo.png");

/** House mark, standing in for a Players to Watch slot the data cannot fill. */
const VV_MARK = "/brand/varsity-voices-square.png";

/**
 * League seal, printed beside the lead story.
 *
 * Copied into public/ from the assets library — assets/ is the master library,
 * not what the site serves. Rendered only when the file is actually there, the
 * same way the sponsor mark is.
 */
function leagueSeal(league: string): string | null {
  const file = league === "MAIS" ? "mais-logo.png" : "mhsaa-logo.png";
  return existsSync(join(process.cwd(), "public", "brand", file))
    ? `/brand/${file}`
    : null;
}

/**
 * Export filename, e.g. "mais-4a-week3-2026-08-28".
 *
 * Leads with league and week because these get saved a dozen at a time on
 * show day, and "recap (3).png" in a downloads folder tells you nothing.
 */
function downloadName(
  league: string,
  classification: string,
  week: string,
  dates: string[],
): string {
  const parts = [
    classification.toLowerCase().startsWith("mais") ? classification : `${league}-${classification}`,
    week ? `week${week}` : "",
    dates[dates.length - 1] ?? "",
  ].filter(Boolean);
  return parts.join("-").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];
const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

/**
 * Headline date: the Sunday on or after the last game, since the show records
 * its recap that day. An explicit ?edition= overrides it.
 */
function editionDate(dates: string[], override?: string): string {
  const last = override || [...dates].sort().pop();
  if (!last) return "";
  const d = new Date(`${last}T12:00:00Z`);
  if (!override) d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7));
  return `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** Short badge text: "7A", or "4A" out of "MAIS-4A". */
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

/**
 * The team half of a caption line — the school, then its class rank when it
 * has one ("Picayune — No. 4").
 *
 * The score is set separately, in its own fixed-width column, so both schools
 * start on the same x whether the score beside them is "0" or "35".
 */
function capTeam(school: string, rank: number | null): string {
  return rank === null ? school : `${school} — No. ${rank}`;
}

/**
 * One sentence describing the result, built only from facts in the data —
 * margin, shutout, overtime, or the game's best stat line.
 */
function heroSub(c: Contest, perf: Performance | undefined): string {
  if (perf) return `${perf.name} of ${perf.school}: ${perf.line.toLowerCase()}.`;
  if (c.loserScore === 0) return `${c.winnerSchool} blanks ${c.loserSchool} in a shutout.`;
  if (c.overtime) return `${c.winnerSchool} survives in overtime.`;
  if (c.margin <= 3) return `${c.winnerSchool} holds on by ${c.margin}.`;
  if (c.loserRank !== null && c.winnerRank !== null && c.winnerRank > c.loserRank) {
    return `${c.winnerSchool} knocks off a higher-ranked ${c.loserSchool}.`;
  }
  return `${c.winnerSchool} wins by ${c.margin}.`;
}

export default async function Newspaper({
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
  const data = await loadDataset(season);
  const league = leagueOf(classification);

  const override = (sp.dates ?? "").split(",").map((d) => d.trim()).filter(Boolean);
  const dates = override.length > 0 ? override : latestSlate(data.games);
  const autoWeek = dates.length > 0 ? leagueWeek(season, league, dates[dates.length - 1]) : null;
  const week = sp.week ?? (autoWeek !== null ? String(autoWeek) : "");

  const sponsor = existsSync(SPONSOR_FILE);
  const seal = leagueSeal(league);
  const ranks = buildPowerRankings(data);
  const paper = buildNewspaper(data, ranks, { classification, dates });
  const heroes = paper.headliners;
  // Give each hero its own best stat line; never repeat a player across cards.
  const used = new Set<string>();
  const heroPerf = heroes.map((h) => {
    // A caption reads as praise, so only the winner's stat line belongs here.
    // With no line for the winner the caption falls back to describing the
    // result, which beats crediting a player on the team that just lost.
    const p = paper.performances.find(
      (x) => !used.has(x.name) && x.team?.id === h.winnerTeam?.id,
    );
    if (p) used.add(p.name);
    return p;
  });
  const players = paper.performances.filter((p) => !used.has(p.name)).slice(0, 4);

  if (paper.contests.length === 0) {
    return (
      <PaperStage>
      <div className="paper">
        <p className="paper__empty">
          No final games found for {classificationLabel(classification)} on{" "}
          {dates.join(", ") || "the most recent slate"}. Add
          ?dates=YYYY-MM-DD,YYYY-MM-DD to pick a different week.
        </p>
      </div>
      </PaperStage>
    );
  }

  return (
    <PaperStage fileName={downloadName(league, classification, week, dates)}>
    <div className="paper">
      <div className="paper__topbar">
        <span>{editionDate(dates, sp.edition)}</span>
        <span>Your #1 Source for All Things Mississippi High School Football</span>
        <span>Section B</span>
      </div>
      <div className="paper__rule" />

      <div className="paper__mastwrap">
        {/* Mirrors the class badge on the right, keeping the nameplate centred. */}
        <div className="paper__sponsor">
          {sponsor ? (
            <>
              {/* Label only alongside the mark — on its own it reads as a
                  caption for something that failed to load. */}
              <span className="paper__sponsor-label">Presented by</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SPONSOR_SRC} alt="C Spire" className="paper__sponsor-img" />
            </>
          ) : null}
        </div>
        <div className="paper__masthead">VARSITY VOICES</div>
        {/* League over class over sport. The week is not repeated here — the
            kicker directly below already carries it. */}
        <div className="paper__badge">
          <span>{league}</span>
          <b>{badgeClass(classification)}</b>
          <small>FOOTBALL</small>
        </div>
      </div>
      <div className="paper__tagline">Covering high school sports across the Magnolia State</div>
      <div className="paper__rule" />

      {/* Relative so the league seal can sit under the badge without pulling
          the centred headline off centre. */}
      <div className="paper__lede">
        <div className="paper__kicker">
          ★ {league} {week ? `WEEK ${week}` : "RECAP"} ★
        </div>
        <div className="paper__headline">{heroes[0] ? headlineFor(heroes[0]) : "RESULTS"}</div>
        <div className="paper__deck">
          {heroes.map((h) => `${h.winnerSchool} ${h.winnerScore}, ${h.loserSchool} ${h.loserScore}.`).join(" ")}
        </div>
        {seal ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={seal} alt={`${league} logo`} className="paper__seal" />
        ) : null}
      </div>

      <div className="paper__body">
        <div className="paper__left">
          <div className="paper__heroes">
            {heroes.map((h, i) => {
              // Led by this class's team, win or lose — see scoreboardSides.
              const { lead, foe, leadWon } = scoreboardSides(h);
              return (
                <div className="hero" key={h.game.id}>
                  <div className="hero__frame">
                    <div className="hero__score">
                      <Crest src={lead.logo} className="hero__logoimg" />
                      {/* Full strength on the winner's number, whichever side
                          leads, so a loss never looks like a win. */}
                      <span style={{ opacity: leadWon ? 1 : 0.75 }}>{lead.score}</span>
                      <span style={{ opacity: 0.45 }}>–</span>
                      <span style={{ opacity: leadWon ? 0.75 : 1 }}>{foe.score}</span>
                      <Crest src={foe.logo} className="hero__logoimg" />
                    </div>
                    <div className="hero__names">
                      <span>{lead.school}</span>
                      <span>{foe.school}</span>
                    </div>
                  </div>
                  <div className="hero__cap">
                    <div className="hero__capline">
                      <span className="hero__capscore">{lead.score}</span>
                      <span>{capTeam(lead.school, lead.rank)}</span>
                    </div>
                    <div className="hero__capline hero__capline--foe">
                      <span className="hero__capscore">{foe.score}</span>
                      <span>{capTeam(foe.school, foe.rank)}</span>
                    </div>
                  </div>
                  <div className="hero__sub">{heroSub(h, heroPerf[i])}</div>
                </div>
              );
            })}
          </div>

          <div className="paper__modules">
            <div className="mod">
              <div className="mod__head">{week ? `Week ${week} Notebook` : "Notebook"}</div>
              {paper.notebook.map((n) => (
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
              <div className="mod__head">Around the State</div>
              {paper.contests
                .filter((c) => !heroes.includes(c))
                .slice(0, 5)
                .map((c) => (
                  <div className="note" key={c.game.id}>
                    <div>
                      <span>
                        {c.winnerSchool} def. {c.loserSchool} {c.winnerScore}-{c.loserScore}.
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            <div className="mod">
              <div className="mod__head">Players to Watch</div>
              {/* Always four cells in a 2x2. Box scores are entered by each
                  team's own coach, so a light week genuinely yields three
                  namable performances or fewer; the house mark fills the gap
                  rather than leaving a hole in the grid. */}
              <div className="players">
                {Array.from({ length: 4 }, (_, i) => players[i]).map((p, i) =>
                  p ? (
                    <div className="player" key={p.name + p.teamName}>
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
            <span>Top {paper.scoreboard.length} Scoreboard</span>
            <span>Final</span>
          </div>
          {paper.scoreboard.map((c, i) => {
            // Led by this class's team, win or lose — see scoreboardSides.
            const { lead, foe, leadWon } = scoreboardSides(c);
            return (
              <div className="board__row" key={c.game.id}>
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
                <span className="board__final">
                  {/* Always rendered, so the scores stay column-aligned
                      whether or not a row carries the mark. */}
                  <i className="board__wl">{leadWon ? "" : "L"}</i>
                  {lead.score}-{foe.score}
                </span>
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

/** Headline chosen from the shape of the lead result, never invented. */
/**
 * Headline options per result shape. Every line in a bank has to be true for
 * ANY result that lands in it, since the pick inside a bank is arbitrary.
 */
const HEADLINES: Record<string, string[]> = {
  bigUpset: [
    "SHOCK TO THE SYSTEM",
    "ORDER UPENDED",
    "NOBODY SAW THIS",
    "THE PECKING ORDER TORE UP",
    "AN UPSET, AND A ROUT",
  ],
  upset: [
    "ORDER UPENDED",
    "UPSET SPECIAL",
    "THE FAVORITE FALLS",
    "RANKINGS MEAN NOTHING",
    "TABLES TURNED",
  ],
  overtime: [
    "EXTRA TIME",
    "SETTLED IN OVERTIME",
    "FOUR QUARTERS WEREN'T ENOUGH",
    "IT WENT LONGER",
  ],
  nailBiter: [
    "DECIDED BY INCHES",
    "DOWN TO THE WIRE",
    "ONE POSSESSION",
    "NO ROOM TO BREATHE",
    "A GAME OF FEET",
  ],
  shutout: [
    "SHUT THE DOOR",
    "NOTHING GOT THROUGH",
    "ZERO ON THE BOARD",
    "BLANKED",
    "NOT A POINT ALLOWED",
  ],
  rout: [
    "NEVER IN DOUBT",
    "FOOT ON THE GAS",
    "RUNAWAY",
    "A STATEMENT MADE",
    "NO CONTEST",
  ],
  standard: [
    "STATEMENTS MADE",
    "BUSINESS HANDLED",
    "WIN AND MOVE ON",
    "ANOTHER ONE BANKED",
    "TAKEN CARE OF",
  ],
};

/** Stable hash, so a page renders the same headline every time it is opened. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Headline chosen from the shape of the lead result, never invented.
 *
 * Each shape has a bank of interchangeable lines rather than one fixed string
 * — the client was seeing "SHOCK TO THE SYSTEM" week after week, and two
 * branches used to return the same "STATEMENTS MADE" so shutouts never got
 * their own line. The choice is keyed off the game id, so it varies between
 * games but never changes between opening the page and screenshotting it.
 */
function headlineFor(c: Contest): string {
  const upset = c.winnerRank !== null && c.loserRank !== null && c.winnerRank > c.loserRank;
  const unrankedUpset = c.winnerRank === null && c.loserRank !== null;
  const bank =
    (upset || unrankedUpset) && c.margin >= 21 ? "bigUpset"
    : upset || unrankedUpset ? "upset"
    : c.overtime ? "overtime"
    : c.margin <= 3 ? "nailBiter"
    : c.loserScore === 0 ? "shutout"
    : c.margin >= 28 ? "rout"
    : "standard";
  const options = HEADLINES[bank];
  return options[hash(c.game.id) % options.length];
}
