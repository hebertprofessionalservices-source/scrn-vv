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
      role: "TKL",
      line: `${s.tackles} TKL · ${s.sacks} SACK · ${s.int} INT`,
    });
  }
  const rusher = top((p) => p.stats.defense.sacks);
  if (rusher && rusher.id !== tackler?.id && rusher.stats.defense.sacks >= 3) {
    const s = rusher.stats.defense;
    defense.push({
      player: rusher,
      role: "EDGE",
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
        {[away, home].map((team) => {
          const { offense, defense } = leadersFor(team, playersByTeam.get(team.id) ?? []);
          return (
            <div key={team.id} className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 p-5">
              <h3 className="font-display text-lg mb-3">{team.name}</h3>
              <LeaderGroup label="Offensive Leaders" leaders={offense} team={team} />
              <LeaderGroup label="Defensive Leaders" leaders={defense} team={team} className="mt-4" />
            </div>
          );
        })}
      </div>
    </section>
  );
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
        <div className="space-y-2">
          {leaders.map(({ player, role, line }) => (
            <Link
              key={`${role}:${player.id}`}
              href={`/players/${player.id}` as any}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-navy-700/60"
            >
              <JerseyAvatar
                jersey={player.jersey}
                primary={team.colors.primary}
                secondary={team.colors.secondary}
                size={32}
              />
              <div className="min-w-0">
                <div className="text-sm">
                  <span className="text-chrome-500">{role}</span>{" "}
                  <span className="text-chrome-100">{player.name}</span>
                </div>
                <div className="text-xs text-chrome-500">{line}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
