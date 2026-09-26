import type { Game } from "./types";

/**
 * Which side won a final game, or "tie". A forfeit is stored 0–0 with
 * `forfeit` naming the side awarded the win, so the score alone can't decide.
 */
export function winnerSide(g: Game): "home" | "away" | "tie" | null {
  if (g.forfeit) return g.forfeit;
  if (g.homeScore === null || g.awayScore === null) return null;
  if (g.homeScore === g.awayScore) return "tie";
  return g.homeScore > g.awayScore ? "home" : "away";
}

/** "W" / "L" / "T" from one team's point of view, or null if not decided. */
export function resultFor(g: Game, isHome: boolean): "W" | "L" | "T" | null {
  const w = winnerSide(g);
  if (w === null) return null;
  if (w === "tie") return "T";
  return (w === "home") === isHome ? "W" : "L";
}
