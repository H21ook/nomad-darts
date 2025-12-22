import { createSlice, current, PayloadAction } from "@reduxjs/toolkit";
import {
  MatchState,
  MatchSettings,
  MatchSnapshot,
  PlayerInit,
  LegType,
  SetType,
  Turn,
} from "../../types/darts";
import { nanoid } from "nanoid";
import { getRandomPlayerColor } from "../utils";
import { RootState } from "./store";

const initialState: MatchState = {
  settings: {
    startingScore: 501,
    firstToLegs: 3,
    firstToSets: 1,
    setsEnabled: false, // Only legs by default
    checkout: "double",
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

const createEmptyLeg = (
  startingScore: number,
  startPlayerIndex: number
): LegType => ({
  id: nanoid(),
  winnerId: null,
  turns: [],
  dartsToFinish: 0,
  startScore: startingScore,
  startTime: Date.now(),
  startPlayerIndex,
});

const createEmptySet = (): SetType => ({
  id: nanoid(),
  winnerId: null,
  legs: [],
});

const takeSnapshotState = (state: MatchState) => {
  // const snapshot: MatchSnapshot = {
  //   players: JSON.parse(JSON.stringify(state.players)),
  //   active: JSON.parse(JSON.stringify(state.active)),
  //   history: JSON.parse(JSON.stringify(state.history)),
  //   status: state.status,
  //   lastLegWinnerId: state.lastLegWinnerId,
  // };

  const snapshot: MatchSnapshot = {
    players: current(state.players),
    active: current(state.active),
    history: {
      completedSets: current(state.history.completedSets),
    },
    status: state.status,
    lastLegWinnerId: state.lastLegWinnerId,
  };

  state.snapshots.push(snapshot);

  // Санах ойг хамгаалах үүднээс сүүлийн 20 үйлдлийг л хадгалж болно
  if (state.snapshots.length > 20) {
    state.snapshots.shift();
  }
};

const handleLegWin = (state: MatchState) => {
  if (state.active === null) return;
  const activePlayerIndex = state.active.playerIndex;
  const activePlayer = state.players[activePlayerIndex];

  // Leg-ийг одоогийн Set- рүү нэмэх
  state.active.currentLeg.winnerId = activePlayer.id;
  state.active.currentSet.legs.push({ ...state.active.currentLeg });
  // state.active.currentLeg.endTime = Date.now();

  activePlayer.legsWon += 1;
  state.lastLegWinnerId = activePlayer.id;
  state.status = "leg_finished";

  if (activePlayer.legsWon >= state.settings.firstToLegs) {
    activePlayer.setsWon += 1;
    state.active.currentSet.winnerId = activePlayer.id;
    state.history.completedSets.push({ ...state.active.currentSet });

    // Match дууссан эсэхийг шалгах
    if (activePlayer.setsWon >= state.settings.firstToSets) {
      state.status = "finished";
      state.winnerId = activePlayer.id;
    } else {
      // Дараагийн сет эхлэх бэлтгэл
      // state.players.forEach((p) => (p.legsWon = 0));
      // state.active.currentSet = { id: nanoid(), legs: [], winnerId: null };
    }
  }
};

const nextPlayer = (state: MatchState) => {
  const activePlayerIndex = state.active?.playerIndex ?? 0;
  return (activePlayerIndex + 1) % state.players.length;
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
      const usedColors: string[] = [];

      // 1. Тохиргоог хадгалах
      state.settings = settings;

      // 2. Тоглогчдыг шинээр үүсгэх (Stats reset)
      state.players = players.map(({ id, name }, index) => {
        const color = getRandomPlayerColor(usedColors);
        usedColors.push(color);
        return {
          id,
          name: name?.trim() || `Player ${index + 1}`,
          score: settings.startingScore,
          order: index + 1,
          color,
          legsWon: 0,
          setsWon: 0,
          totalDartsThrown: 0,
          totalPointsScored: 0,
          checkoutAttempts: 0,
          lastThrows: [],
        };
      });

      // 3. Идэвхтэй төлөвийг (Active State) бэлдэх
      state.status = "playing";
      state.winnerId = null;
      state.lastLegWinnerId = null;

      // 4. Шатласан бүтцийг эхлүүлэх (ШИНЭ ХЭСЭГ)

      const startPlayerIndex = 0;
      const firstLeg = createEmptyLeg(settings.startingScore, startPlayerIndex);
      const firstSet = createEmptySet();

      state.active = {
        playerIndex: startPlayerIndex,
        currentLeg: firstLeg,
        currentSet: firstSet,
      };

      // 5. Түүхийг цэвэрлэх
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
    nextLeg: (state) => {
      if (state.active === null) return;
      if (state.status === "playing") return;

      // Зөвхөн leg дууссан үед л ажиллана
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
      state.players.forEach((p) => (p.score = state.settings.startingScore));
      state.status = "playing";
      state.lastLegWinnerId = null;

      // Шинэ Leg үүсгэх
      state.active.currentLeg = createEmptyLeg(
        state.settings.startingScore,
        nextStartPlayerIndex
      );

      state.active.playerIndex = nextStartPlayerIndex;
    },
  },
});

export const { startMatch, submitTurn, undo, nextLeg } = matchSlice.actions;
export const selectCanUndo = (state: RootState) =>
  state.match.snapshots.length > 0;
export default matchSlice.reducer;
