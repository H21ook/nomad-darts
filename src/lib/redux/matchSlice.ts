import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MatchState, MatchSettings } from "../../types/darts";

const initialState: MatchState = {
  matchId: null,
  settings: {
    startingScore: 501,
    legsToWinSet: 3,
    setsToWinMatch: 1,
    players: ["Player 1", "Player 2"],
  },
  players: [],
  activePlayerIndex: 0,
  history: [],
  status: "setup",
  winnerId: null,
  currentTurnThrows: [],
};

// Helper: Deep copy state for history
const snapshotState = (state: MatchState): MatchState => {
  // Exclude history from the snapshot to avoid recursive explosion
  const { history: _history, ...rest } = state;
  return { ...rest, history: [] } as MatchState;
};

const matchSlice = createSlice({
  name: "match",
  initialState,
  reducers: {
    startMatch: (state, action: PayloadAction<MatchSettings>) => {
      state.settings = action.payload;
      state.players = action.payload.players.map((name, i) => ({
        id: `player-${i}`,
        name,
        score: action.payload.startingScore,
        legsWon: 0,
        setsWon: 0,
      }));
      state.activePlayerIndex = 0;
      state.status = "playing";
      state.winnerId = null;
      state.currentTurnThrows = [];
      state.history = []; // Reset history
    },

    submitTurn: (
      state,
      action: PayloadAction<{ score: number; dartsUsed?: number }>
    ) => {
      if (state.status !== "playing") return;

      const snapshot = snapshotState(state);
      state.history.push(snapshot);

      const activePlayer = state.players[state.activePlayerIndex];
      const { score } = action.payload;

      // Bust check
      const remaining = activePlayer.score - score;

      if (remaining < 0 || remaining === 1) {
        // Bust
        // Score doesn't change
        // Switch player
        state.activePlayerIndex = (state.activePlayerIndex + 1) % 2;
      } else if (remaining === 0) {
        // checkout
        activePlayer.score = 0;
        activePlayer.legsWon += 1;

        // Sets logic
        if (activePlayer.legsWon >= state.settings.legsToWinSet) {
          activePlayer.setsWon += 1;
          activePlayer.legsWon = 0;
          state.players.forEach((p) => (p.legsWon = 0));

          if (activePlayer.setsWon >= state.settings.setsToWinMatch) {
            state.status = "finished";
            state.winnerId = activePlayer.id;
            return;
          }
        }

        // Reset for next leg
        state.players.forEach((p) => (p.score = state.settings.startingScore));
        state.activePlayerIndex = (state.activePlayerIndex + 1) % 2; // Alternate logic for now
      } else {
        // Normal score
        activePlayer.score = remaining;
        state.activePlayerIndex = (state.activePlayerIndex + 1) % 2;
      }
    },

    undo: (state) => {
      const previous = state.history.pop();
      if (previous) {
        // Restore state but keep the popped history (already popped)
        // We need to preserve the *remaining* history which is currently in state.history
        const currentHistory = state.history;
        Object.assign(state, previous);
        state.history = currentHistory;
      }
    },
  },
});

export const { startMatch, submitTurn, undo } = matchSlice.actions;
export default matchSlice.reducer;
