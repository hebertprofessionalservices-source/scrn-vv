import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TeamLogo } from "@/components/brand/team-logo";
import { displaySlug } from "@/lib/display-slug";
import type { Team } from "@/lib/types";

export function TeamCard({ team }: { team: Team }) {
  const slug = displaySlug(team);
  return (
    <Link href={`/teams/${slug}` as any}>
      <Card className="p-4 hover:border-crimson-500 transition-colors h-full flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <TeamLogo src={team.logoUrl} size={48} />
          <div>
            <h3 className="font-display text-lg leading-tight">{team.name}</h3>
            <p className="text-xs text-chrome-500">{team.city}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <Badge variant="outline">{team.classification}</Badge>
          <span className="text-sm text-chrome-300">
            {team.record.wins}–{team.record.losses}
          </span>
        </div>
      </Card>
    </Link>
  );
}
