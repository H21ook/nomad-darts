import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";
import { useAppSelector } from "./hooks";
import { CheckoutType } from "../../types/darts";

// Guest match history — local-first (redux-persist), no backend write.
// Minimal serializable snapshot of a finished match.

export interface FinishedMatchPlayerSummary {
  id: string;
  name: string;
  color: string;
}

export interface FinishedMatchScoreSummary {
  playerId: string;
  setsWon: number;
  legsWon: number;
}

export interface FinishedMatchSummary {
  id: string;
  date: number;
  players: FinishedMatchPlayerSummary[];
  winnerId: string | null;
  settings: {
    startingScore: number;
    firstToLegs: number;
    firstToSets: number;
    setsEnabled: boolean;
    checkout: CheckoutType;
    randomOrder: boolean;
  };
  finalScores: FinishedMatchScoreSummary[];
}

export interface MatchHistoryState {
  matches: FinishedMatchSummary[];
}

// localStorage хэмжээг хязгаарлах (redux-persist bloat-оос сэргийлэх)
const MAX_HISTORY_ENTRIES = 20;

const initialState: MatchHistoryState = {
  matches: [],
};

const matchHistorySlice = createSlice({
  name: "matchHistory",
  initialState,
  reducers: {
    addFinishedMatch: (state, action: PayloadAction<FinishedMatchSummary>) => {
      const summary = action.payload;
      // Dedupe by match id — StrictMode double-dispatch / remount-ээс хамгаалах
      if (state.matches.some((m) => m.id === summary.id)) return;
      state.matches = [summary, ...state.matches].slice(0, MAX_HISTORY_ENTRIES);
    },
    clearHistory: (state) => {
      state.matches = [];
    },
  },
});

export const { addFinishedMatch, clearHistory } = matchHistorySlice.actions;

export const selectMatchHistory = (state: RootState) =>
  state.matchHistory.matches;

export const useMatchHistory = () => useAppSelector(selectMatchHistory);

export default matchHistorySlice.reducer;