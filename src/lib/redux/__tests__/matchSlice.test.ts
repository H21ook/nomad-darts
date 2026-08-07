import { describe, it, expect } from "vitest";
import matchReducer, {
  startMatch,
  submitTurn,
  undo,
  startNextLeg,
  rematch,
  abandonMatch,
  selectCanUndo,
} from "../matchSlice";
import type { MatchSettings, MatchState, PlayerInit } from "../../../types/darts";
import type { RootState } from "../store";

const baseSettings: MatchSettings = {
  startingScore: 501,
  firstToLegs: 3,
  firstToSets: 1,
  setsEnabled: false,
  checkout: "double",
  randomOrder: false,
};

const defaultPlayers: PlayerInit[] = [
  { id: "p1", name: "Alice", color: "#22d3ee" },
  { id: "p2", name: "Bob", color: "#818cf8" },
];

const startPayload = (
  overrides: Partial<MatchSettings> = {},
  players: PlayerInit[] = defaultPlayers
): MatchSettings & { players: PlayerInit[] } => ({
  ...baseSettings,
  ...overrides,
  players,
});

const initState = (): MatchState => matchReducer(undefined, { type: "@@INIT" });

const startPlaying = (
  overrides: Partial<MatchSettings> = {},
  players: PlayerInit[] = defaultPlayers
): MatchState => matchReducer(initState(), startMatch(startPayload(overrides, players)));

const asRootState = (state: MatchState): RootState =>
  ({ match: state }) as unknown as RootState;

describe("startMatch", () => {
  it("initializes a playing match with settings, players and active state", () => {
    const state = startPlaying({ startingScore: 301, firstToLegs: 5 });

    expect(state.status).toBe("playing");
    expect(state.settings.startingScore).toBe(301);
    expect(state.settings.firstToLegs).toBe(5);
    expect(state.players).toHaveLength(2);
    expect(state.players.map((p) => p.order)).toEqual([1, 2]);
    expect(state.players.every((p) => p.score === 301)).toBe(true);
    expect(
      state.players.every(
        (p) =>
          p.legsWon === 0 &&
          p.setsWon === 0 &&
          p.totalDartsThrown === 0 &&
          p.totalPointsScored === 0
      )
    ).toBe(true);
    expect(state.active?.playerIndex).toBe(0);
    expect(state.active?.currentLeg.turns).toEqual([]);
    expect(state.history.completedSets).toEqual([]);
    expect(state.snapshots).toEqual([]);
    expect(state.winnerId).toBeNull();
    expect(state.lastLegWinnerId).toBeNull();
  });

  it("keeps player order when randomOrder is false", () => {
    const state = startPlaying();
    expect(state.players.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("preserves the same player ids when randomOrder is true", () => {
    const state = startPlaying({ randomOrder: true });
    expect(state.players.map((p) => p.id).sort()).toEqual(["p1", "p2"]);
  });

  it("falls back to PLAYER_COLORS when a player has no color", () => {
    const state = startPlaying({}, [{ id: "p1", name: "Alice" }]);
    expect(state.players[0].color).toBe("#22d3ee");
  });

  it("falls back to a default name when the name is blank", () => {
    const state = startPlaying({}, [{ id: "p1", name: "   " }]);
    expect(state.players[0].name).toBe("Player 1");
  });
});

describe("submitTurn — bust semantics", () => {
  it("marks a bust on overshoot, scores 0 points and keeps the score", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 600 }));

    const turn = state.active!.currentLeg.turns[0];
    expect(turn.isBust).toBe(true);
    expect(turn.points).toBe(0);
    expect(turn.dartsUsed).toBe(3);
    expect(turn.remainingScore).toBe(501);
    expect(state.players[0].score).toBe(501); // unchanged
    expect(state.players[0].totalDartsThrown).toBe(3);
    expect(state.active!.playerIndex).toBe(1); // next player
    expect(state.status).toBe("playing");
  });

  it("marks a bust when landing on 1 with double-out checkout", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 500 }));

    const turn = state.active!.currentLeg.turns[0];
    expect(turn.isBust).toBe(true);
    expect(turn.points).toBe(0);
    expect(state.players[0].score).toBe(501); // unchanged
    expect(state.active!.playerIndex).toBe(1);
  });

  it("marks a bust when isBust is explicitly true", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 60, isBust: true }));

    const turn = state.active!.currentLeg.turns[0];
    expect(turn.isBust).toBe(true);
    expect(turn.points).toBe(0);
    expect(state.players[0].score).toBe(501); // unchanged
    expect(state.active!.playerIndex).toBe(1);
  });

  it("does not bust when landing on 1 with straight checkout", () => {
    let state = startPlaying({ checkout: "straight" });
    state = matchReducer(state, submitTurn({ score: 500 }));

    const turn = state.active!.currentLeg.turns[0];
    expect(turn.isBust).toBe(false);
    expect(state.players[0].score).toBe(1);
  });

  it("decrements the score on a normal hit", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));

    const turn = state.active!.currentLeg.turns[0];
    expect(turn.isBust).toBe(false);
    expect(turn.points).toBe(60);
    expect(turn.remainingScore).toBe(441);
    expect(state.players[0].score).toBe(441);
    expect(state.players[0].totalPointsScored).toBe(60);
    expect(state.active!.playerIndex).toBe(1);
  });
});

describe("submitTurn — darts-used tracking", () => {
  it("increments totalDartsThrown by the passed dartsUsed", () => {
    for (const dartsUsed of [1, 2, 3]) {
      const state = matchReducer(startPlaying(), submitTurn({ score: 60, dartsUsed }));
      expect(state.players[0].totalDartsThrown).toBe(dartsUsed);
    }
  });

  it("counts 3 darts for a bust regardless of dartsUsed", () => {
    const state = matchReducer(
      startPlaying(),
      submitTurn({ score: 600, dartsUsed: 1 })
    );
    expect(state.players[0].totalDartsThrown).toBe(3);
  });

  it("adds 0 darts when dartsUsed is omitted (current reducer behavior)", () => {
    // Behavior snapshot: submitTurn defaults dartsUsed to 0; the UI always
    // passes an explicit value. Do not assume a default of 3.
    const state = matchReducer(startPlaying(), submitTurn({ score: 60 }));
    expect(state.players[0].totalDartsThrown).toBe(0);
  });
});

describe("leg win and startNextLeg", () => {
  it("finishes the leg when the remaining score reaches 0", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));

    expect(state.status).toBe("leg_finished");
    expect(state.lastLegWinnerId).toBe("p1");
    expect(state.active!.currentLeg.winnerId).toBe("p1");
    expect(state.active!.currentSet.legs).toHaveLength(1);
    expect(state.players[0].legsWon).toBe(1);
    expect(state.players[0].score).toBe(0);
  });

  it("startNextLeg advances to a new leg and resets scores", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    const finishedLegId = state.active!.currentLeg.id;

    state = matchReducer(state, startNextLeg());

    expect(state.status).toBe("playing");
    expect(state.players.every((p) => p.score === 501)).toBe(true);
    expect(state.active!.currentLeg.id).not.toBe(finishedLegId);
    expect(state.active!.currentLeg.turns).toEqual([]);
    expect(state.lastLegWinnerId).toBeNull();
    // First player of leg 2 alternates: (setStart 0 + legsInSet 1) % 2 = 1
    expect(state.active!.playerIndex).toBe(1);
  });

  it("startNextLeg is a no-op while the match is still playing", () => {
    let state = startPlaying();
    const legId = state.active!.currentLeg.id;
    state = matchReducer(state, startNextLeg());

    expect(state.active!.currentLeg.id).toBe(legId);
    expect(state.snapshots).toHaveLength(0);
  });
});

describe("set and match finish", () => {
  it("finishes the match when legs reach firstToLegs with sets disabled", () => {
    let state = startPlaying({ firstToLegs: 1 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));

    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p1");
  });

  it("finishes a set and starts a new set when sets are enabled", () => {
    let state = startPlaying({ setsEnabled: true, firstToLegs: 1, firstToSets: 2 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));

    // Set 1: Alice wins → setsWon 1, not yet firstToSets (2)
    expect(state.status).toBe("leg_finished");
    expect(state.players[0].setsWon).toBe(1);
    expect(state.history.completedSets).toHaveLength(1);
    expect(state.active!.currentSet.winnerId).toBe("p1");

    state = matchReducer(state, startNextLeg());
    expect(state.status).toBe("playing");
    expect(state.players[0].legsWon).toBe(0); // legs reset for the new set
    // Set 2 alternates: setStartPlayerIndex = completedSetsCount % n = 1 → Bob starts
    expect(state.active!.playerIndex).toBe(1);

    // Set 2: Bob wins → setsWon 1, still not firstToSets (2)
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("leg_finished");
    expect(state.players[1].setsWon).toBe(1);

    // Set 3: alternates back to Alice; winning it reaches firstToSets (2)
    state = matchReducer(state, startNextLeg());
    expect(state.active!.playerIndex).toBe(0);
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p1");
    expect(state.players[0].setsWon).toBe(2);
  });

  it("finishes the match via sets when firstToSets is reached", () => {
    let state = startPlaying({ setsEnabled: true, firstToLegs: 1, firstToSets: 1 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));

    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p1");
    expect(state.history.completedSets).toHaveLength(1);
  });
});

describe("undo", () => {
  it("restores the previous state after a turn", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    expect(state.players[0].score).toBe(441);
    expect(state.active!.playerIndex).toBe(1);

    state = matchReducer(state, undo());
    expect(state.players[0].score).toBe(501);
    expect(state.active!.playerIndex).toBe(0);
    expect(state.snapshots).toHaveLength(0);
  });

  it("restores score and player index after a bust", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 600 }));
    expect(state.players[0].totalDartsThrown).toBe(3);

    state = matchReducer(state, undo());
    expect(state.players[0].totalDartsThrown).toBe(0);
    expect(state.players[0].score).toBe(501);
    expect(state.active!.playerIndex).toBe(0);
  });

  it("caps snapshots at 20", () => {
    let state = startPlaying();
    for (let i = 0; i < 21; i++) {
      state = matchReducer(state, submitTurn({ score: 1, dartsUsed: 1 }));
    }
    expect(state.snapshots).toHaveLength(20);
  });

  it("is a no-op when there are no snapshots", () => {
    let state = startPlaying();
    const before = state;
    state = matchReducer(state, undo());

    expect(state.status).toBe("playing");
    expect(state.active!.playerIndex).toBe(before.active!.playerIndex);
    expect(state.snapshots).toHaveLength(0);
  });
});

describe("turn alternation", () => {
  it("alternates the active player after each turn", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    expect(state.active!.playerIndex).toBe(1);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    expect(state.active!.playerIndex).toBe(0);
  });

  it("alternates correctly with 3 players", () => {
    const threePlayers: PlayerInit[] = [
      { id: "p1", name: "Alice", color: "#22d3ee" },
      { id: "p2", name: "Bob", color: "#818cf8" },
      { id: "p3", name: "Carol", color: "#f472b6" },
    ];
    let state = startPlaying({}, threePlayers);

    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    expect(state.active!.playerIndex).toBe(1);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    expect(state.active!.playerIndex).toBe(2);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    expect(state.active!.playerIndex).toBe(0);
  });

  it("alternates the first player of each leg via startNextLeg", () => {
    let state = startPlaying();
    // Leg 1: Alice (index 0) wins
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    state = matchReducer(state, startNextLeg());
    expect(state.active!.playerIndex).toBe(1); // Bob starts leg 2

    // Leg 2: Bob (index 1) wins
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    state = matchReducer(state, startNextLeg());
    expect(state.active!.playerIndex).toBe(0); // Alice starts leg 3
  });
});

describe("rematch", () => {
  it("resets to playing with the same settings and players", () => {
    let state = startPlaying({ firstToLegs: 1 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p1");

    state = matchReducer(state, rematch());

    expect(state.status).toBe("playing");
    expect(state.winnerId).toBeNull();
    expect(state.settings).toEqual({
      startingScore: 501,
      firstToLegs: 1,
      firstToSets: 1,
      setsEnabled: false,
      checkout: "double",
      randomOrder: false,
    });
    expect(state.players.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(state.players.map((p) => p.name)).toEqual(["Alice", "Bob"]);
    expect(state.players.every((p) => p.score === 501)).toBe(true);
    expect(state.players.every((p) => p.legsWon === 0 && p.setsWon === 0)).toBe(true);
    expect(state.players.every((p) => p.totalDartsThrown === 0)).toBe(true);
    expect(state.history.completedSets).toEqual([]);
    expect(state.snapshots).toEqual([]);
  });

  it("starts with the player after the previous winner", () => {
    let state = startPlaying({ firstToLegs: 1 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    state = matchReducer(state, rematch());

    // Winner was p1 (index 0) → next start index is 1
    expect(state.active!.playerIndex).toBe(1);
  });
});

describe("abandonMatch", () => {
  it("sets status to setup and clears active state and snapshots", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    expect(state.snapshots).toHaveLength(1);

    state = matchReducer(state, abandonMatch());

    expect(state.status).toBe("setup");
    expect(state.active).toBeNull();
    expect(state.snapshots).toEqual([]);
  });
});

describe("selectCanUndo", () => {
  it("returns false when there are no snapshots", () => {
    const state = startPlaying();
    expect(selectCanUndo(asRootState(state))).toBe(false);
  });

  it("returns true after a turn and false after undo", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    expect(selectCanUndo(asRootState(state))).toBe(true);

    state = matchReducer(state, undo());
    expect(selectCanUndo(asRootState(state))).toBe(false);
  });
});