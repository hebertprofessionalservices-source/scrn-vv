import { MatchupFull } from "@/components/matchup/matchup-full";

export default async function MatchupPage({
  params,
}: {
  params: Promise<{ matchup: string }>;
}) {
  const { matchup } = await params;
  return <MatchupFull matchup={matchup} />;
}
