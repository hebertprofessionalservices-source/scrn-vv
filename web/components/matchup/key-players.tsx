import Link from "next/link";
import { JerseyAvatar } from "@/components/player/jersey-avatar";
import type { SideLeaders, StatLeader } from "@/lib/game-leaders";
import type { Player, Team } from "@/lib/types";

export function KeyPlayers({
  away,
  home,
  leaders,
}: {
  away: Team;
  home: Team;
  leaders: { away: SideLeaders; home: SideLeaders };
}) {
  return (
    <section>
      <h2 className="font-display text-xl mb-3">Key Players</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <TeamKeyPlayersCard team={away} leaders={leaders.away} />
        <TeamKeyPlayersCard team={home} leaders={leaders.home} />
      </div>
    </section>
  );
}

/**
 * Single-team variant for the team page, where it sits beside the schedule.
 * The column stretches so the card matches the schedule's height.
 */
export function TeamKeyPlayers({ team, leaders }: { team: Team; leaders: SideLeaders }) {
  return (
    <section className="flex flex-col">
      <h2 className="font-display text-2xl mb-3">Key Players</h2>
      <TeamKeyPlayersCard team={team} leaders={leaders} className="flex-1" />
    </section>
  );
}

function TeamKeyPlayersCard({
  team,
  leaders,
  className = "",
}: {
  team: Team;
  leaders: SideLeaders;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-chrome-500/15 bg-navy-700/40 p-5 ${className}`}
    >
      <h3 className="font-display text-lg mb-3">{team.name}</h3>
      {/* Offense and defense sit side by side (client call, Sep 2 2026), so a
          team's card is half as tall and both units read at a glance. */}
      <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
        <LeaderGroup label="Offensive Leaders" leaders={leaders.offense} team={team} />
        <LeaderGroup label="Defensive Leaders" leaders={leaders.defense} team={team} />
      </div>
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
  leaders: StatLeader[];
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
