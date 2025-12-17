export type GameType = "301" | "501";

export interface Player {
  id: string; // 'player1' | 'player2' for local, or UUID for auth
  name: string;
  score: number; // Current leg score (e.g., 501 -> 0)
  legsWon: number;
  setsWon: number;
}

export interface MatchSettings {
  startingScore: number;
  legsToWinSet: number;
  setsToWinMatch: number;
  players: [string, string]; // Names
}

export interface Throw {
  score: number; // Total value (e.g., T20 = 60)
  segment: number; // 20
  multiplier: 1 | 2 | 3;
  isBust: boolean;
}

export interface Turn {
  playerId: string;
  throws: Throw[];
  startScore: number; // Score before this turn
}

export interface MatchState {
  matchId: string | null;
  settings: MatchSettings;
  players: Player[];
  activePlayerIndex: number; // 0 or 1
  history: MatchState[]; // For Undo/Redo - snapshots of state
  status: "setup" | "playing" | "finished";
  winnerId: string | null;
  currentTurnThrows: Throw[]; // Throws in the current turn (up to 3)
}
