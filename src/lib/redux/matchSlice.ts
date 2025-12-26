import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MatchState, MatchSettings, PlayerInit, Turn } from "../../types/darts";
import { nanoid } from "nanoid";
import { getRandomPlayerColor, PLAYER_COLORS } from "../utils";
import { RootState } from "./store";
import {
  createEmptyLeg,
  createEmptySet,
  handleLegWin,
  nextPlayer,
  resetScores,
  takeSnapshotState,
} from "./utils";

const initialState: MatchState = {
  id: nanoid(),
  settings: {
    startingScore: 501,
    firstToLegs: 3,
    firstToSets: 1,
    setsEnabled: false, // Only legs by default
    checkout: "double",
    randomOrder: true,
  },
  players: [
    {
      id: nanoid(),
      name: "Player 1",
      score: 501,
      order: 1,
      legsWon: 0,
      setsWon: 0,
      color: getRandomPlayerColor(),
      totalDartsThrown: 0,
      totalPointsScored: 0,
      checkoutAttempts: 0,
      lastThrows: [],
    },
    {
      id: nanoid(),
      name: "Player 2",
      score: 501,
      order: 2,
      legsWon: 0,
      setsWon: 0,
      color: getRandomPlayerColor(),
      totalDartsThrown: 0,
      totalPointsScored: 0,
      checkoutAttempts: 0,
      lastThrows: [],
    },
  ],
  active: null,
  history: {
    completedSets: [],
  },
  lastLegWinnerId: null,
  status: "setup",
  winnerId: null,
  snapshots: [],
};

const matchSlice = createSlice({
  name: "match",
  initialState,
  reducers: {
    startMatch: (
      state,
      action: PayloadAction<MatchSettings & { players: PlayerInit[] }>
    ) => {
      const { players, ...settings } = action.payload;
      let orderedPlayers = players;

      // 1. Тохиргоог хадгалах
      state.settings = settings;

      // 2. Тоглогчдын дарааллыг холих
      if (settings.randomOrder) {
        orderedPlayers = players.sort(() => Math.random() - 0.5);
      }

      // 3. Тоглогчдыг шинээр үүсгэх (Stats reset)
      state.players = orderedPlayers.map(({ id, name, color }, index) => {
        const pColor = color || PLAYER_COLORS[index];
        return {
          id,
          name: name?.trim() || `Player ${index + 1}`,
          score: settings.startingScore,
          order: index + 1,
          color: pColor,
          legsWon: 0,
          setsWon: 0,
          totalDartsThrown: 0,
          totalPointsScored: 0,
          checkoutAttempts: 0,
          lastThrows: [],
        };
      });

      // 4. Идэвхтэй төлөвийг (Active State) бэлдэх
      state.id = nanoid();
      state.status = "playing";
      state.winnerId = null;
      state.lastLegWinnerId = null;

      // 5. Шатласан бүтцийг эхлүүлэх (ШИНЭ ХЭСЭГ)

      const startPlayerIndex = 0;
      const firstLeg = createEmptyLeg(settings.startingScore, startPlayerIndex);
      const firstSet = createEmptySet();

      state.active = {
        playerIndex: startPlayerIndex,
        currentLeg: firstLeg,
        currentSet: firstSet,
      };

      // 6. Түүхийг цэвэрлэх
      state.history = {
        completedSets: [],
      };
      state.snapshots = []; // Undo хийхэд зориулсан
    },

    submitTurn: (
      state,
      action: PayloadAction<{ score: number; dartsUsed?: number }>
    ) => {
      if (state.status !== "playing" || state.active === null) return;

      takeSnapshotState(state);

      const activePlayerIndex = state.active.playerIndex;
      const activePlayer = state.players[activePlayerIndex];
      const { score, dartsUsed = 0 } = action.payload;
      const remaining = activePlayer.score - score;

      // 1. Bust Logic
      const isBust =
        remaining < 0 ||
        (remaining === 1 && state.settings.checkout === "double");

      const turn: Turn = {
        playerId: activePlayer.id,
        points: isBust ? 0 : score,
        isBust: isBust,
        dartsUsed: isBust ? 3 : dartsUsed, // шидсэн сумны тоо
        throws: [],
        remainingScore: isBust ? activePlayer.score : remaining,
        timestamp: Date.now(),
      };

      state.active.currentLeg.turns.push(turn);

      if (isBust) {
        activePlayer.totalDartsThrown += 3;
        state.active.playerIndex = nextPlayer(state);
        return;
      }

      // 2. Normal Hit
      activePlayer.score = remaining;
      activePlayer.totalDartsThrown += dartsUsed;

      // 3. Checkout Logic
      if (remaining === 0) {
        handleLegWin(state);
      } else {
        state.active.playerIndex = nextPlayer(state);
      }
    },

    undo: (state) => {
      if (state.snapshots.length === 0) return;

      const lastSnapshot = state.snapshots.pop();

      if (lastSnapshot) {
        state.players = lastSnapshot.players;
        state.active = lastSnapshot.active;
        state.history = lastSnapshot.history;
        state.status = lastSnapshot.status;
        state.lastLegWinnerId = lastSnapshot.lastLegWinnerId;
      }
    },
    startNextLeg: (state) => {
      if (state.active === null) return;
      if (state.status !== "leg_finished") return;

      takeSnapshotState(state);

      // Сет солигдож байгаа эсэр
      const isNewSetStarting = state.players.some(
        (p) => p.legsWon >= state.settings.firstToLegs
      );

      if (isNewSetStarting) {
        state.players.forEach((p) => (p.legsWon = 0));
        state.active.currentSet = { id: nanoid(), legs: [], winnerId: null };
      }

      const completedSetsCount = state.history.completedSets.length;

      // Сет доторх дууссан легийн тоо
      const legsInCurrentSet = state.active.currentSet.legs.length;
      let nextStartPlayerIndex: number;

      const setStartPlayerIndex = completedSetsCount % state.players.length;

      if (legsInCurrentSet === 0) {
        // Шинэ Сет эхэлж байна: Эхлэх тоглогч нь Сетийн дарааллаар
        nextStartPlayerIndex = setStartPlayerIndex;
      } else {
        // Сет доторх дараагийн Лег: Сетийн эхлэгч дээр нэмэх нь тоглосон Легүүд
        nextStartPlayerIndex =
          (setStartPlayerIndex + legsInCurrentSet) % state.players.length;
      }

      // Оноо болон статус шинэчлэх
      resetScores(state);
      state.status = "playing";
      state.lastLegWinnerId = null;

      // Шинэ Leg үүсгэх
      state.active.currentLeg = createEmptyLeg(
        state.settings.startingScore,
        nextStartPlayerIndex
      );

      state.active.playerIndex = nextStartPlayerIndex;
    },
    rematch: (state) => {
      state.id = nanoid();

      const settings = state.settings;
      const usedColors: string[] = [];

      state.players = state.players.map((p, index) => {
        const color = p.color || getRandomPlayerColor(usedColors);
        usedColors.push(color);

        return {
          ...p,
          score: settings.startingScore,
          order: index + 1,
          legsWon: 0,
          setsWon: 0,
          totalDartsThrown: 0,
          totalPointsScored: 0,
          checkoutAttempts: 0,
          lastThrows: [],
        };
      });

      // 3. Status reset
      state.status = "playing";
      state.winnerId = null;
      state.lastLegWinnerId = null;

      // 4. Эхлэх тоглогч
      const previousWinnerIndex = state.players.findIndex(
        (p) => p.id === state.winnerId
      );

      const startPlayerIndex =
        previousWinnerIndex >= 0
          ? (previousWinnerIndex + 1) % state.players.length
          : 0;

      // 5. Шинэ Leg + Set
      const firstLeg = createEmptyLeg(settings.startingScore, startPlayerIndex);

      const firstSet = createEmptySet();

      state.active = {
        playerIndex: startPlayerIndex,
        currentLeg: firstLeg,
        currentSet: firstSet,
      };

      // 6. History + snapshots цэвэрлэх
      state.history = {
        completedSets: [],
      };

      state.snapshots = [];
    },
  },
});

export const { startMatch, submitTurn, undo, startNextLeg, rematch } =
  matchSlice.actions;
export const selectCanUndo = (state: RootState) =>
  state.match.snapshots.length > 0;
export default matchSlice.reducer;
