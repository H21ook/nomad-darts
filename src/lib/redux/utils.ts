import { LegType, MatchSnapshot, MatchState, SetType } from "@/types/darts";
import { nanoid } from "nanoid";

// match-slice utils
export const createEmptyLeg = (
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

export const createEmptySet = (): SetType => ({
  id: nanoid(),
  winnerId: null,
  legs: [],
});

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const resetScores = (state: MatchState) => {
  state.players.forEach((p) => (p.score = state.settings.startingScore));
};

export const takeSnapshotState = (state: MatchState) => {
  const snapshot: MatchSnapshot = {
    players: deepClone(state.players),
    active: deepClone(state.active),
    history: {
      completedSets: deepClone(state.history.completedSets),
    },
    status: state.status,
    lastLegWinnerId: state.lastLegWinnerId,
    winnerId: state.winnerId,
  };

  state.snapshots.push(snapshot);

  // Санах ойг хамгаалах үүднээс сүүлийн 20 үйлдлийг л хадгалж болно
  if (state.snapshots.length > 20) {
    state.snapshots.shift();
  }
};

const finishMatch = (state: MatchState) => {
  if (state.active === null) return;
  const activePlayerIndex = state.active.playerIndex;
  const activePlayer = state.players[activePlayerIndex];

  state.status = "match_finished"
  state.winnerId = activePlayer.id;
};

const finishSet = (state: MatchState) => {
  if (state.active === null) return;
  const activePlayerIndex = state.active.playerIndex;
  const activePlayer = state.players[activePlayerIndex];

  activePlayer.setsWon += 1;
  state.active.currentSet.winnerId = activePlayer.id;
  state.history.completedSets.push(deepClone(state.active.currentSet));

  // Match дууссан эсэхийг шалгах
  if (activePlayer.setsWon >= state.settings.firstToSets) {
    finishMatch(state);
  }
};

export const handleLegWin = (state: MatchState) => {
  if (state.active === null) return;
  const activePlayerIndex = state.active.playerIndex;
  const activePlayer = state.players[activePlayerIndex];

  // Leg-ийг одоогийн Set- рүү нэмэх
  state.active.currentLeg.winnerId = activePlayer.id;
  state.active.currentSet.legs.push(deepClone(state.active.currentLeg));
  // state.active.currentLeg.endTime = Date.now();

  activePlayer.legsWon += 1;
  state.lastLegWinnerId = activePlayer.id;

  // ✅ Sets disabled бол: legs хүрмэгц match дуусгана
  if (!state.settings.setsEnabled) {
    if (activePlayer.legsWon >= state.settings.firstToLegs) {
      finishMatch(state);
      return;
    }
    state.status = "leg_finished";
    return;
  }

  // ✅ Sets enabled бол: leg_finished → set logic
  state.status = "leg_finished";
  if (activePlayer.legsWon >= state.settings.firstToLegs) {
    finishSet(state);
  }
};

export const nextPlayer = (state: MatchState) => {
  const activePlayerIndex = state.active?.playerIndex ?? 0;
  return (activePlayerIndex + 1) % state.players.length;
};
