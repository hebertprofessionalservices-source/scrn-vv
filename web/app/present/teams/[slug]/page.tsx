import { notFound } from "next/navigation";
import { loadDataset, currentSeason } from "@/lib/data-server";
import { formatGameDate } from "@/lib/format-date";
import { classificationLabel, titleCaseSlug } from "@/lib/team-format";

export default async function PresentTeam({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const season = await currentSeason();
  const data = await loadDataset(season);
  const team = data.teamsBySlug.get(slug);
  if (!team) notFound();
  const games = (data.gamesByTeam.get(team.id) ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <h1 className="font-display">{team.name}</h1>
      <p className="text-3xl text-chrome-300">{classificationLabel(team.classification)} · {team.record.wins}–{team.record.losses}{team.headCoach ? ` · Coach ${team.headCoach}` : ""}</p>
      <table className="w-full mt-8 text-2xl">
        <thead><tr className="text-chrome-500"><th className="text-left">Date</th><th className="text-left">Opponent</th><th className="text-right">Result</th></tr></thead>
        <tbody>
          {games.map((g) => {
            const isHome = g.homeTeamId === team.id;
            const oppId = isHome ? g.awayTeamId : g.homeTeamId;
            const opp = data.teamsByAlias.get(oppId);
            const sf = isHome ? g.homeScore : g.awayScore;
            const sa = isHome ? g.awayScore : g.homeScore;
            return (
              <tr key={g.id} className="border-t border-chrome-500/20">
                <td className="py-2">{formatGameDate(g.date)}</td>
                <td className="py-2">{isHome ? "vs" : "@"} {opp?.name ?? titleCaseSlug(oppId)}</td>
                <td className="py-2 text-right">{g.status === "final" && sf != null && sa != null ? `${sf > sa ? "W" : "L"} ${sf}–${sa}` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
