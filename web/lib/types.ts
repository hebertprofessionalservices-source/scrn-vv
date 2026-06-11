export type Position = "QB" | "RB" | "WR" | "TE" | "OL" | "DL" | "LB" | "DB" | "K" | "P" | "ATH";
export type PlayerClass = "FR" | "SO" | "JR" | "SR";
export type GameStatus = "final" | "scheduled" | "in_progress" | "postponed";
export type DataStatus = "complete" | "incomplete" | "missing";
export type Classification =
  | "1A" | "2A" | "3A" | "4A" | "5A" | "6A" | "7A"
  | "MAIS-1A" | "MAIS-2A" | "MAIS-3A" | "MAIS-4A" | "MAIS-5A" | "MAIS-6A"
  | "MAIS-8M-1A" | "MAIS-8M-2A";

export interface TeamRecord { wins: number; losses: number; }
export interface TeamRankings {
  stateOverall: number | null;
  stateClass: number | null;
  national: number | null;
}
export interface TeamStats {
  pointsFor: number; pointsAgainst: number;
  yardsFor: number; yardsAgainst: number;
  passYdsFor: number; rushYdsFor: number;
  passYdsAgainst: number; rushYdsAgainst: number;
  turnoversForced: number; turnoversLost: number;
}
export interface TeamColors { primary: string | null; secondary: string | null; }

export interface Team {
  id: string;
  name: string;
  mascot: string | null;
  city: string | null;
  classification: Classification;
  district: string | null;
  logoUrl: string | null;
  colors: TeamColors;
  season: string;
  record: TeamRecord;
  rankings: TeamRankings;
  stats: TeamStats;
  headCoach: string | null;
  maxprepsUrl: string | null;
}

export interface PassingStats { att: number; cmp: number; yds: number; td: number; int: number; rating: number; }
export interface RushingStats { att: number; yds: number; td: number; ypc: number; }
export interface ReceivingStats { rec: number; yds: number; td: number; }
export interface DefenseStats { tackles: number; sacks: number; int: number; ff: number; }
export interface KickingStats { fgm: number; fga: number; xpm: number; xpa: number; }
export interface PlayerStats {
  passing: PassingStats; rushing: RushingStats; receiving: ReceivingStats;
  defense: DefenseStats; kicking: KickingStats;
}

export interface Player {
  id: string;
  teamId: string;
  season: string;
  name: string;
  jersey: string | null;
  position: Position;
  class: PlayerClass;
  height: string | null;
  weight: number | null;
  stats: PlayerStats;
  gamesPlayed: number;
}

export interface BoxScoreEntry {
  playerId: string;
  cmp?: number | null; att?: number | null; yds?: number | null;
  td?: number | null; int?: number | null; rec?: number | null;
  tackles?: number | null; sacks?: number | null; ff?: number | null;
  fgm?: number | null; fga?: number | null; xpm?: number | null; xpa?: number | null;
}
export interface BoxScore {
  passing: BoxScoreEntry[]; rushing: BoxScoreEntry[];
  receiving: BoxScoreEntry[]; defense: BoxScoreEntry[];
}
export interface QuarterScores { home: number[]; away: number[]; }

export interface Game {
  id: string;
  season: string;
  week: number;
  date: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  quarterScores: QuarterScores;
  status: GameStatus;
  dataStatus: DataStatus;
  venue: string | null;
  boxScore: BoxScore | null;
  maxprepsUrl: string | null;
}

export interface Editorial {
  currentSeason: string;
  currentWeek: number;
  gameOfTheWeek: {
    gameId: string | null;
    storyline: string;
    pickedBy: string;
    pickedAt: string;
  };
  topPerformerNotes: Partial<Record<"QB" | "RB" | "WR" | "DEF", string>>;
  featuredQuote: string;
}
