import type { Player } from "./types";

export interface RunPassSplit {
  rush: number;
  pass: number;
}

/** Team run/pass balance from roster attempt totals; null when unknown. */
export function runPassAttempts(players: Player[]): RunPassSplit | null {
  const acc = players.reduce(
    (a, p) => ({ rush: a.rush + p.stats.rushing.att, pass: a.pass + p.stats.passing.att }),
    { rush: 0, pass: 0 },
  );
  return acc.rush + acc.pass > 0 ? acc : null;
}

/** "62% / 38%" (run share / pass share). */
export function runPassLabel(rp: RunPassSplit): string {
  const run = Math.round((rp.rush / (rp.rush + rp.pass)) * 100);
  return `${run}% / ${100 - run}%`;
}
