export type GameType = "X01" | "CRICKET" | "PRACTICE";

export interface PlayerInit {
  id: string;
  name: string;
  isError?: boolean;
}
export interface Player extends PlayerInit {
  score: number;
  legsWon: number;
  setsWon: number;
  order: number;
}

export interface MatchSettings {
  startingScore: number;
  firstToSets: number;
  firstToLegs: number;
  players: PlayerInit[];
  setsEnabled: boolean;
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

export interface Match {
  id: string;
  user_id: string;
  settings: MatchSettings;
  game_type: GameType;
  status: "setup" | "playing" | "finished";
  winnerId: string | null;
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
