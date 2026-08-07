export type GameType = "X01" | "CRICKET" | "PRACTICE";
export type CheckoutType = "double" | "straight";
export interface PlayerInit {
  id: string;
  name?: string;
  color?: string;
}
export interface Player {
  id: string;
  name: string;
  score: number;
  legsWon: number;
  setsWon: number;
  order: number;
  totalDartsThrown: number; // Нийт шидсэн сумны тоо (Average тооцоход)
  totalPointsScored: number; // Нийт авсан оноо
  color: string;
  image?: string;
}

export interface MatchSettings {
  startingScore: number;
  firstToSets: number;
  firstToLegs: number;
  setsEnabled: boolean;
  checkout: CheckoutType;
  randomOrder: boolean;
}

// Ээлж: Тоглогчийн нэг удаа самбарт очих үе (3 сум)
export interface Turn {
  playerId: string;
  points: number; // Энэ ээлжинд авсан нийт оноо
  isBust: boolean;
  dartsUsed: number;
  remainingScore: number; // Шидсэний дараа үлдсэн оноо
  timestamp: number;
}

// 3. Leg: Нэг бүтэн тоглолт (Жишээ нь 501)
export interface LegType {
  id: string;
  winnerId: string | null;
  turns: Turn[]; // Энэ лег-д хийгдсэн бүх ээлжүүд
  startScore: number; // 501, 301 гэх мэт
  startTime: number;
  startPlayerIndex: number;
}

// 4. Set: Хэд хэдэн Leg-ийн нийлбэр (Жишээ нь Best of 5 legs)
export interface SetType {
  id: string;
  winnerId: string | null;
  legs: LegType[]; // Энэ сет-д багтсан бүх лег-үүд
}

export type MatchStatus = "setup" | "playing" | "match_finished" | "leg_finished";
export interface Match {
  id: string;
  settings: MatchSettings;
  players: Player[];
  sets: SetType[];
  currentSetId: string;
  currentLegId: string;
  status: MatchStatus;
  overallWinnerId: string | null;
}

export interface MatchSnapshot {
  players: Player[];
  active: Active | null;
  history: {
    completedSets: SetType[];
  };
  status: MatchStatus;
  lastLegWinnerId: string | null;
  winnerId: string | null;
}

export interface Active {
  playerIndex: number;
  // currentTurn?: Turn;
  currentLeg: LegType;
  currentSet: SetType;
}

export interface MatchState {
  id: string;
  settings: MatchSettings;

  // Одоо тоглож буй төлөв
  active: Active | null;

  // Дууссан өгөгдөл (Stats-д зориулсан)
  history: {
    completedSets: SetType[]; // Сетгүй байсан ч энд 1 сет хадгалагдана
  };

  players: Player[];
  status: MatchStatus;
  lastLegWinnerId: string | null;
  winnerId: string | null;
  snapshots: MatchSnapshot[];
}
