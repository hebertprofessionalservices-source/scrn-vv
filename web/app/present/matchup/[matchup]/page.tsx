import { MatchupFull } from "@/components/matchup/matchup-full";

/** Broadcast view: the full matchup page, chrome-free for on-air use. */
export default async function PresentMatchup({
  params,
}: {
  params: Promise<{ matchup: string }>;
}) {
  const { matchup } = await params;
  return <MatchupFull matchup={matchup} broadcast />;
}
