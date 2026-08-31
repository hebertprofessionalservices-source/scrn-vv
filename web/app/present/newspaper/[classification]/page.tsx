import "./newspaper.css";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { currentSeason, loadDataset } from "@/lib/data-server";
import { buildPowerRankings } from "@/lib/power";
import {
  buildNewspaper,
  latestSlate,
  leagueOf,
  leagueWeek,
  type Contest,
  type Performance,
} from "@/lib/newspaper";
import { classificationLabel } from "@/lib/team-format";
import { PaperStage } from "./paper-stage";


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
 * One caption line per team — "NO. 22 MERIDIAN 47" over "NO. 4 OCEAN SPRINGS 9"
 * — so the winner and the loser never run together mid-line the way a single
 * wrapped sentence does.
 */
function heroLine(school: string, rank: number | null, score: number): string {
  return `${rank ? `NO. ${rank} ` : ""}${school} ${score}`;
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
    <PaperStage>
    <div className="paper">
      <div className="paper__topbar">
        <span>{editionDate(dates, sp.edition)}</span>
        <span>The Voice of Mississippi High School Sports</span>
        <span>Section B</span>
      </div>
      <div className="paper__rule" />

      <div className="paper__mastwrap">
        {/* Mirrors the class badge on the right, keeping the nameplate centred. */}
        <div className="paper__sponsor">
          {sponsor ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={SPONSOR_SRC} alt="C Spire" className="paper__sponsor-img" />
          ) : null}
        </div>
        <div className="paper__masthead">VARSITY VOICES</div>
        <div className="paper__badge">
          <b>{badgeClass(classification)}</b>
          <span>{week ? `WEEK ${week}` : "RECAP"}</span>
          <small>PREP FOOTBALL</small>
        </div>
      </div>
      <div className="paper__tagline">Covering high school sports across the Magnolia State</div>
      <div className="paper__rule" />

      <div className="paper__kicker">
        ★ {league} {week ? `WEEK ${week}` : "RECAP"} ★
      </div>
      <div className="paper__headline">{heroes[0] ? headlineFor(heroes[0]) : "RESULTS"}</div>
      <div className="paper__deck">
        {heroes.map((h) => `${h.winnerSchool} ${h.winnerScore}, ${h.loserSchool} ${h.loserScore}.`).join(" ")}
      </div>

      <div className="paper__body">
        <div className="paper__left">
          <div className="paper__heroes">
            {heroes.map((h, i) => (
              <div className="hero" key={h.game.id}>
                <div className="hero__frame">
                  <div className="hero__score">
                    <Crest src={h.winnerLogo} className="hero__logoimg" />
                    <span>{h.winnerScore}</span>
                    <span style={{ opacity: 0.45 }}>–</span>
                    <span style={{ opacity: 0.75 }}>{h.loserScore}</span>
                    <Crest src={h.loserLogo} className="hero__logoimg" />
                  </div>
                  <div className="hero__names">
                    <span>{h.winnerSchool}</span>
                    <span>{h.loserSchool}</span>
                  </div>
                </div>
                <div className="hero__cap">
                  <span>{heroLine(h.winnerSchool, h.winnerRank, h.winnerScore)}</span>
                  <span>{heroLine(h.loserSchool, h.loserRank, h.loserScore)}</span>
                </div>
                <div className="hero__sub">{heroSub(h, heroPerf[i])}</div>
              </div>
            ))}
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
              <div className="players">
                {players.map((p) => (
                  <div className="player" key={p.name + p.teamName}>
                    <div className="player__top">
                      <Crest src={p.logo} className="player__logoimg" />
                      <span>{p.school}</span>
                    </div>
                    <div className="player__name">{p.name}</div>
                    <div className="player__line">{p.line}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="paper__right">
          <div className="board__head">
            <span>Top {paper.scoreboard.length} Scoreboard</span>
            <span>Final</span>
          </div>
          {paper.scoreboard.map((c, i) => (
            <div className="board__row" key={c.game.id}>
              <span className="board__rank">{i + 1}</span>
              <Crest src={c.winnerLogo} className="board__logo" />
              <span className="board__teams">
                <b>
                  {seed(c.winnerRank)}
                  {c.winnerSchool}
                </b>
                <i>
                  vs {seed(c.loserRank)}
                  {c.loserSchool}
                </i>
              </span>
              <Crest src={c.loserLogo} className="board__logo" />
              <span className="board__final">
                {c.winnerScore}-{c.loserScore}
              </span>
            </div>
          ))}
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
function headlineFor(c: Contest): string {
  const upset = c.winnerRank !== null && c.loserRank !== null && c.winnerRank > c.loserRank;
  const unrankedUpset = c.winnerRank === null && c.loserRank !== null;
  if ((upset || unrankedUpset) && c.margin >= 21) return "SHOCK TO THE SYSTEM";
  if (upset || unrankedUpset) return "ORDER UPENDED";
  if (c.overtime) return "EXTRA TIME";
  if (c.margin <= 3) return "DECIDED BY INCHES";
  if (c.loserScore === 0) return "STATEMENTS MADE";
  return "STATEMENTS MADE";
}
