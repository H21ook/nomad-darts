import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MatchState, MatchSettings } from "../../types/darts";
import { nanoid } from "nanoid";

const initialState: MatchState = {
  matchId: null,
  settings: {
    startingScore: 501,
    firstToLegs: 3,
    firstToSets: 1,
    setsEnabled: false, // Only legs by default
    players: [
      {
        id: nanoid(),
        name: "Player 1",
      },
      {
        id: nanoid(),
        name: "Player 2",
      },
    ],
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
      state.players = action.payload.players.map(({ id, name }, index) => ({
        id,
        name: name?.trim() || `Player ${index + 1}`,
        score: action.payload.startingScore,
        order: index + 1,
        legsWon: 0,
        setsWon: 0,
      }));
      state.activePlayerIndex = 0;
      state.status = "playing";
      state.winnerId = null;
      state.currentTurnThrows = [];
      state.history = [];
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
      const remaining = activePlayer.score - score;

      // 1. Bust Logic
      if (remaining < 0 || remaining === 1) {
        state.activePlayerIndex =
          (state.activePlayerIndex + 1) % state.players.length;
        return;
      }

      // 2. Normal Hit
      activePlayer.score = remaining;

      // 3. Checkout Logic
      if (remaining === 0) {
        activePlayer.legsWon += 1;

        // Check: Sets enabled?
        if (state.settings.setsEnabled) {
          // Sets Mode
          if (activePlayer.legsWon >= state.settings.firstToLegs) {
            activePlayer.setsWon += 1;
            // Reset all players' legs won
            state.players.forEach((p) => (p.legsWon = 0));

            if (activePlayer.setsWon >= state.settings.firstToSets) {
              state.status = "finished";
              state.winnerId = activePlayer.id;
              return;
            }
          }
        } else {
          // Legs Only Mode
          if (activePlayer.legsWon >= state.settings.firstToLegs) {
            state.status = "finished";
            state.winnerId = activePlayer.id;
            return;
          }
        }

        // Reset for next leg
        state.players.forEach((p) => (p.score = state.settings.startingScore));
        // Switch to next player
        state.activePlayerIndex =
          (state.activePlayerIndex + 1) % state.players.length;
      } else {
        // Score is not 0, switch to next player
        state.activePlayerIndex =
          (state.activePlayerIndex + 1) % state.players.length;
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
