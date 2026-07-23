import Link from "next/link";
import { JerseyAvatar } from "@/components/player/jersey-avatar";
import type { Player, Team } from "@/lib/types";

interface Leader {
  player: Player;
  role: string;
  line: string;
}

function leadersFor(team: Team, players: Player[]): { offense: Leader[]; defense: Leader[] } {
  const top = (metric: (p: Player) => number) =>
    players.reduce<Player | null>(
      (best, p) => (metric(p) > (best ? metric(best) : 0) ? p : best),
      null,
    );

  const offense: Leader[] = [];
  const qb = top((p) => p.stats.passing.yds);
  if (qb) {
    const s = qb.stats.passing;
    offense.push({
      player: qb,
      role: "QB",
      line: `${s.yds.toLocaleString()} YDS · ${s.td} TD · ${s.int} INT · ${s.rating.toFixed(1)} RAT`,
    });
  }
  const rb = top((p) => p.stats.rushing.yds);
  if (rb) {
    const s = rb.stats.rushing;
    offense.push({
      player: rb,
      role: "RB",
      line: `${s.yds.toLocaleString()} YDS · ${s.td} TD · ${s.ypc.toFixed(1)} YPC`,
    });
  }
  const wr = top((p) => p.stats.receiving.yds);
  if (wr) {
    const s = wr.stats.receiving;
    offense.push({
      player: wr,
      role: "WR",
      line: `${s.rec} REC · ${s.yds.toLocaleString()} YDS · ${s.td} TD`,
    });
  }

  const defense: Leader[] = [];
  const tackler = top((p) => p.stats.defense.tackles);
  if (tackler) {
    const s = tackler.stats.defense;
    defense.push({
      player: tackler,
      role: tackler.position,
      line: `${s.tackles} TKL · ${s.sacks} SACK · ${s.int} INT`,
    });
  }
  const rusher = top((p) => p.stats.defense.sacks);
  if (rusher && rusher.id !== tackler?.id && rusher.stats.defense.sacks >= 3) {
    const s = rusher.stats.defense;
    defense.push({
      player: rusher,
      role: rusher.position,
      line: `${s.sacks} SACK · ${s.tackles} TKL · ${s.ff} FF`,
    });
  }
  return { offense, defense };
}

export function KeyPlayers({
  away,
  home,
  playersByTeam,
}: {
  away: Team;
  home: Team;
  playersByTeam: Map<string, Player[]>;
}) {
  return (
    <section>
      <h2 className="font-display text-xl mb-3">Key Players</h2>
      <div className="grid md:grid-cols-2 gap-6">
        {[away, home].map((team) => (
          <TeamKeyPlayersCard
            key={team.id}
            team={team}
            players={playersByTeam.get(team.id) ?? []}
          />
        ))}
      </div>
    </section>
  );
}

/** Single-team variant for the team page. */
export function TeamKeyPlayers({ team, players }: { team: Team; players: Player[] }) {
  return (
    <section>
      <h2 className="font-display text-2xl mb-3">Key Players</h2>
      <div className="max-w-2xl">
        <TeamKeyPlayersCard team={team} players={players} />
      </div>
    </section>
  );
}

function TeamKeyPlayersCard({ team, players }: { team: Team; players: Player[] }) {
  const { offense, defense } = leadersFor(team, players);
  return (
    <div className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 p-5">
      <h3 className="font-display text-lg mb-3">{team.name}</h3>
      <LeaderGroup label="Offensive Leaders" leaders={offense} team={team} />
      <LeaderGroup label="Defensive Leaders" leaders={defense} team={team} className="mt-4" />
    </div>
  );
}

const CLASS_LABEL: Record<string, string> = { FR: "Fr", SO: "So", JR: "Jr", SR: "Sr" };

/** "6-2 · 205 lbs" from whichever parts exist. */
function sizeLabel(p: Player): string | null {
  const parts = [p.height, p.weight ? `${p.weight} lbs` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function LeaderGroup({
  label,
  leaders,
  team,
  className = "",
}: {
  label: string;
  leaders: Leader[];
  team: Team;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs uppercase tracking-wider text-chrome-500 mb-2">{label}</div>
      {leaders.length === 0 ? (
        <div className="text-sm text-chrome-500">n/a — no published stats</div>
      ) : (
        <div className="space-y-3">
          {leaders.map(({ player, role, line }) => (
            <Link
              key={`${role}:${player.id}`}
              href={`/players/${player.id}` as any}
              className="flex items-start gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-navy-700/60"
            >
              <JerseyAvatar
                jersey={player.jersey}
                primary={team.colors.primary}
                secondary={team.colors.secondary}
                size={32}
              />
              {/* Client-specified order: position, name, class, size, stats. */}
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider text-chrome-500">{role}</div>
                <div className="text-sm text-chrome-100">{player.name}</div>
                <div className="text-xs text-chrome-500">
                  {CLASS_LABEL[player.class] ?? player.class}
                </div>
                {sizeLabel(player) && (
                  <div className="text-xs text-chrome-500">{sizeLabel(player)}</div>
                )}
                <div className="text-xs text-chrome-300 mt-0.5">{line}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
