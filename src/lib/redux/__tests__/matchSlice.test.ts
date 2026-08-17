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
import { store } from "../store";

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

const threePlayers: PlayerInit[] = [
  { id: "p1", name: "Alice", color: "#22d3ee" },
  { id: "p2", name: "Bob", color: "#818cf8" },
  { id: "p3", name: "Carol", color: "#f472b6" },
];

const fourPlayers: PlayerInit[] = [
  { id: "p1", name: "Alice", color: "#22d3ee" },
  { id: "p2", name: "Bob", color: "#818cf8" },
  { id: "p3", name: "Carol", color: "#f472b6" },
  { id: "p4", name: "Dan", color: "#fbbf24" },
];

const singlePlayer: PlayerInit[] = [
  { id: "p1", name: "Alice", color: "#22d3ee" },
];

// Resume predicate mirroring src/app/page.tsx (D6): a match is resumable
// only when status is exactly "playing" and an active leg/set exists.
const canResume = (s: MatchState): boolean =>
  s.status === "playing" && s.active !== null;

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
    expect(turn.dartsUsed).toBe(0); // dartsUsed omitted → 0 on a bust too
    expect(turn.remainingScore).toBe(501);
    expect(state.players[0].score).toBe(501); // unchanged
    expect(state.players[0].totalDartsThrown).toBe(0);
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

  it("counts the actual dartsUsed for a bust", () => {
    const state = matchReducer(
      startPlaying(),
      submitTurn({ score: 600, dartsUsed: 1 })
    );
    expect(state.players[0].totalDartsThrown).toBe(1);
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
    expect(state.players[0].totalDartsThrown).toBe(0); // dartsUsed omitted → 0

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

// [1] startMatch variations: player counts, random order, score/legs settings
describe("startMatch — variations", () => {
  it("starts a 3-player match with ids, order and starting scores", () => {
    const state = startPlaying({}, threePlayers);

    expect(state.players.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
    expect(state.players.map((p) => p.order)).toEqual([1, 2, 3]);
    expect(state.players.every((p) => p.score === 501)).toBe(true);
  });

  it("starts a 4-player match with ids, order and starting scores", () => {
    const state = startPlaying({}, fourPlayers);

    expect(state.players).toHaveLength(4);
    expect(state.players.map((p) => p.order)).toEqual([1, 2, 3, 4]);
    expect(state.players[3].id).toBe("p4");
  });

  it("starts a single-player match at index 0", () => {
    const state = startPlaying({}, singlePlayer);

    expect(state.players).toHaveLength(1);
    expect(state.players[0].order).toBe(1);
    expect(state.active?.playerIndex).toBe(0);
  });

  it("randomOrder with 3 players keeps all ids and reassigns orders 1..3", () => {
    const state = startPlaying({ randomOrder: true }, threePlayers);

    expect(state.players.map((p) => p.id).sort()).toEqual(["p1", "p2", "p3"]);
    expect(state.players.map((p) => p.order)).toEqual([1, 2, 3]);
  });

  it("assigns PLAYER_COLORS in order to 3 players without colors", () => {
    const state = startPlaying({}, [
      { id: "p1" },
      { id: "p2" },
      { id: "p3" },
    ]);

    expect(state.players.map((p) => p.color)).toEqual([
      "#22d3ee",
      "#818cf8",
      "#f472b6",
    ]);
  });

  it("honors a custom startingScore for all 3 players", () => {
    const state = startPlaying({ startingScore: 301 }, threePlayers);

    expect(state.players.every((p) => p.score === 301)).toBe(true);
    expect(state.active?.currentLeg.startScore).toBe(301);
  });

  it("honors firstToLegs and firstToSets settings", () => {
    const state = startPlaying({ firstToLegs: 5, firstToSets: 3, setsEnabled: true });

    expect(state.settings.firstToLegs).toBe(5);
    expect(state.settings.firstToSets).toBe(3);
    expect(state.settings.setsEnabled).toBe(true);
  });

  it("clears a previous finished match when starting again", () => {
    let state = startPlaying({ firstToLegs: 1 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("match_finished");

    state = matchReducer(state, startMatch(startPayload({ firstToLegs: 3 })));

    expect(state.status).toBe("playing");
    expect(state.winnerId).toBeNull();
    expect(state.lastLegWinnerId).toBeNull();
    expect(state.history.completedSets).toEqual([]);
    expect(state.snapshots).toEqual([]);
    expect(state.players.every((p) => p.legsWon === 0 && p.setsWon === 0)).toBe(
      true
    );
  });

  it("falls back to Player N names for 3 unnamed players in order", () => {
    const state = startPlaying({}, [{ id: "p1" }, { id: "p2" }, { id: "p3" }]);

    expect(state.players.map((p) => p.name)).toEqual([
      "Player 1",
      "Player 2",
      "Player 3",
    ]);
  });

  it("generates a fresh match id on each start", () => {
    const first = startPlaying();
    const second = startPlaying();

    expect(first.id).not.toBe(second.id);
  });

  it("starts a 3-player match with empty turn history and no winner", () => {
    const state = startPlaying({}, threePlayers);

    expect(state.active?.currentLeg.turns).toEqual([]);
    expect(state.active?.currentSet.legs).toEqual([]);
    expect(state.lastLegWinnerId).toBeNull();
  });
});

// [2] submitTurn guards: no-ops at leg_finished / match_finished / setup / active null
describe("submitTurn — guards", () => {
  it("is a no-op when the leg is finished", () => {
    let state = startPlaying({ firstToLegs: 2 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("leg_finished");

    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));

    expect(state.status).toBe("leg_finished");
    expect(state.active!.currentLeg.turns).toHaveLength(1);
    expect(state.snapshots).toHaveLength(1);
    expect(state.players[0].score).toBe(0);
  });

  it("is a no-op when the match is finished", () => {
    let state = startPlaying({ firstToLegs: 1 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("match_finished");

    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));

    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p1");
    expect(state.active!.currentLeg.turns).toHaveLength(1);
    expect(state.snapshots).toHaveLength(1);
  });

  it("is a no-op at setup status", () => {
    let state = initState();
    expect(state.status).toBe("setup");

    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));

    expect(state.status).toBe("setup");
    expect(state.active).toBeNull();
    expect(state.snapshots).toHaveLength(0);
  });

  it("is a no-op when active is null after abandon", () => {
    let state = startPlaying();
    state = matchReducer(state, abandonMatch());
    expect(state.active).toBeNull();

    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));

    expect(state.status).toBe("setup");
    expect(state.players[0].score).toBe(501);
    expect(state.snapshots).toHaveLength(0);
  });

  it("leaves the state untouched when guarded (deep equality)", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("leg_finished");
    const before = JSON.parse(JSON.stringify(state));

    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));

    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
  });
});

// [3] Auto-bust edges: overshoots, remaining 1, zero-point turns
describe("submitTurn — auto-bust edges", () => {
  it("busts when overshooting by exactly 1", () => {
    const state = matchReducer(
      startPlaying(),
      submitTurn({ score: 502, dartsUsed: 3 })
    );
    const turn = state.active!.currentLeg.turns[0];

    expect(turn.isBust).toBe(true);
    expect(state.players[0].score).toBe(501);
  });

  it("busts on a large overshoot", () => {
    const state = matchReducer(startPlaying(), submitTurn({ score: 999, dartsUsed: 3 }));

    expect(state.active!.currentLeg.turns[0].isBust).toBe(true);
    expect(state.players[0].score).toBe(501);
    expect(state.players[0].totalPointsScored).toBe(0);
  });

  it("busts when landing on remaining 1 mid-leg with double checkout", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 499, dartsUsed: 3 })); // p1 → 2
    expect(state.players[0].score).toBe(2);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p2
    state = matchReducer(state, submitTurn({ score: 1, dartsUsed: 1 })); // p1 → 1 → bust

    const turn = state.active!.currentLeg.turns[2];
    expect(turn.isBust).toBe(true);
    expect(turn.dartsUsed).toBe(1); // actual darts thrown on the bust
    expect(state.players[0].score).toBe(2); // unchanged
    expect(state.active!.playerIndex).toBe(1);
  });

  it("records remainingScore equal to the pre-turn score on a bust", () => {
    const state = matchReducer(startPlaying(), submitTurn({ score: 600 }));
    const turn = state.active!.currentLeg.turns[0];

    expect(turn.remainingScore).toBe(501);
  });

  it("treats a score of 0 without isBust as a normal zero-point turn", () => {
    const state = matchReducer(startPlaying(), submitTurn({ score: 0 }));
    const turn = state.active!.currentLeg.turns[0];

    expect(turn.isBust).toBe(false);
    expect(turn.points).toBe(0);
    expect(state.players[0].score).toBe(501);
    expect(state.active!.playerIndex).toBe(1);
  });

  it("treats a score of 0 with isBust as a bust", () => {
    const state = matchReducer(startPlaying(), submitTurn({ score: 0, isBust: true }));
    const turn = state.active!.currentLeg.turns[0];

    expect(turn.isBust).toBe(true);
    expect(turn.dartsUsed).toBe(0); // dartsUsed omitted → 0 on a bust too
    expect(state.players[0].totalDartsThrown).toBe(0);
    expect(state.active!.playerIndex).toBe(1);
  });

  it("busts from a non-501 starting score", () => {
    const state = matchReducer(
      startPlaying({ startingScore: 301 }),
      submitTurn({ score: 302 })
    );

    expect(state.active!.currentLeg.turns[0].isBust).toBe(true);
    expect(state.players[0].score).toBe(301);
  });
});

// [4] Checkout finishes: dartsUsed recording, exact-score fields, 1/40 checkouts,
//     second-player and 3-player finishes
describe("checkout finishes", () => {
  it("records dartsUsed 1 on an exact checkout", () => {
    const state = matchReducer(startPlaying(), submitTurn({ score: 501, dartsUsed: 1 }));
    const turn = state.active!.currentLeg.turns[0];

    expect(turn.dartsUsed).toBe(1);
    expect(state.players[0].totalDartsThrown).toBe(1);
  });

  it("records dartsUsed 2 on an exact checkout", () => {
    const state = matchReducer(startPlaying(), submitTurn({ score: 501, dartsUsed: 2 }));

    expect(state.active!.currentLeg.turns[0].dartsUsed).toBe(2);
  });

  it("records dartsUsed 3 on an exact checkout", () => {
    const state = matchReducer(startPlaying(), submitTurn({ score: 501, dartsUsed: 3 }));

    expect(state.active!.currentLeg.turns[0].dartsUsed).toBe(3);
  });

  it("sets all winner fields on an exact-score finish", () => {
    const state = matchReducer(startPlaying(), submitTurn({ score: 501, dartsUsed: 3 }));

    expect(state.status).toBe("leg_finished");
    expect(state.lastLegWinnerId).toBe("p1");
    expect(state.active!.currentLeg.winnerId).toBe("p1");
    expect(state.active!.currentSet.legs).toHaveLength(1);
    expect(state.players[0].legsWon).toBe(1);
  });

  it("records full checkout turn fields", () => {
    const state = matchReducer(startPlaying(), submitTurn({ score: 501, dartsUsed: 2 }));
    const turn = state.active!.currentLeg.turns[0];

    expect(turn.playerId).toBe("p1");
    expect(turn.points).toBe(501);
    expect(turn.isBust).toBe(false);
    expect(turn.remainingScore).toBe(0);
    expect(state.players[0].score).toBe(0);
  });

  it("finishes a leg at 1 with straight checkout", () => {
    let state = startPlaying({ checkout: "straight" });
    state = matchReducer(state, submitTurn({ score: 500, dartsUsed: 3 })); // p1 → 1
    expect(state.players[0].score).toBe(1);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p2
    state = matchReducer(state, submitTurn({ score: 1, dartsUsed: 1 })); // p1 checks out

    expect(state.status).toBe("leg_finished");
    expect(state.lastLegWinnerId).toBe("p1");
    expect(state.active!.currentLeg.turns[2].dartsUsed).toBe(1);
  });

  it("finishes a leg by hitting exactly 40 (double 20)", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 461, dartsUsed: 2 })); // p1 → 40
    expect(state.players[0].score).toBe(40);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p2
    state = matchReducer(state, submitTurn({ score: 40, dartsUsed: 2 })); // p1 checks out

    expect(state.status).toBe("leg_finished");
    expect(state.players[0].score).toBe(0);
  });

  it("lets the second player finish the leg", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    expect(state.active!.playerIndex).toBe(1);

    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));

    expect(state.status).toBe("leg_finished");
    expect(state.lastLegWinnerId).toBe("p2");
    expect(state.players[1].score).toBe(0);
    expect(state.players[0].score).toBe(441);
  });

  it("starts the next leg with the player after the winner in a 3-player match", () => {
    let state = startPlaying({ firstToLegs: 3 }, threePlayers);
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.lastLegWinnerId).toBe("p1");

    state = matchReducer(state, startNextLeg());

    // setStart 0 + legsInSet 1 → player 1 (the player after the winner)
    expect(state.active!.playerIndex).toBe(1);
  });

  it("increments legsWon and records the finished leg in the set", () => {
    const state = matchReducer(startPlaying(), submitTurn({ score: 501, dartsUsed: 3 }));

    expect(state.players[0].legsWon).toBe(1);
    expect(state.active!.currentSet.legs[0].winnerId).toBe("p1");
    expect(state.active!.currentSet.legs[0].turns).toHaveLength(1);
  });
});

// [5] Finish sequences: full matches, set rotation, ties, status chains
describe("finish sequences", () => {
  it("plays a full first-to-3-legs 2-player match with alternating starts", () => {
    let state = startPlaying({ firstToLegs: 3 });
    const starts: number[] = [state.active!.playerIndex];
    const legWinners: string[] = [];

    // Leg 1 → p1 wins
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    legWinners.push(state.lastLegWinnerId!);
    state = matchReducer(state, startNextLeg());
    starts.push(state.active!.playerIndex);

    // Leg 2 → p2 wins
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    legWinners.push(state.lastLegWinnerId!);
    state = matchReducer(state, startNextLeg());
    starts.push(state.active!.playerIndex);

    // Leg 3 → p1 wins (2-1)
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    legWinners.push(state.lastLegWinnerId!);
    state = matchReducer(state, startNextLeg());
    starts.push(state.active!.playerIndex);

    // Leg 4 → p2 wins (2-2)
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    legWinners.push(state.lastLegWinnerId!);
    state = matchReducer(state, startNextLeg());
    starts.push(state.active!.playerIndex);

    // Leg 5 → p1 wins (3-2) → match finished
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    legWinners.push(state.lastLegWinnerId!);

    expect(starts).toEqual([0, 1, 0, 1, 0]);
    expect(legWinners).toEqual(["p1", "p2", "p1", "p2", "p1"]);
    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p1");
    expect(state.players[0].legsWon).toBe(3);
    expect(state.players[1].legsWon).toBe(2);
  });

  it("sets winnerId and lastLegWinnerId on match finish", () => {
    let state = startPlaying({ firstToLegs: 1 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));

    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p1");
    expect(state.lastLegWinnerId).toBe("p1");
  });

  it("keeps winnerId null mid-match while lastLegWinnerId is set", () => {
    let state = startPlaying({ firstToLegs: 3 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));

    expect(state.status).toBe("leg_finished");
    expect(state.winnerId).toBeNull();
    expect(state.lastLegWinnerId).toBe("p1");
  });

  it("decides a 1-1 tie in the third leg", () => {
    let state = startPlaying({ firstToLegs: 2 });
    // Leg 1: p1 wins
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    state = matchReducer(state, startNextLeg());
    // Leg 2: p2 wins → tie 1-1
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.players[1].legsWon).toBe(1);
    state = matchReducer(state, startNextLeg());
    // Leg 3: p1 wins → 2-1 match finished
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));

    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p1");
    expect(state.players[0].legsWon).toBe(2);
  });

  it("rotates set starters across a 3-player sets-enabled match", () => {
    let state = startPlaying(
      { setsEnabled: true, firstToLegs: 1, firstToSets: 2 },
      threePlayers
    );
    const setStarters: number[] = [state.active!.playerIndex];

    // Set 1: p1 wins
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.players[0].setsWon).toBe(1);
    state = matchReducer(state, startNextLeg());
    setStarters.push(state.active!.playerIndex);

    // Set 2: p2 wins
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    state = matchReducer(state, startNextLeg());
    setStarters.push(state.active!.playerIndex);

    // Set 3: p3 wins
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    state = matchReducer(state, startNextLeg());
    setStarters.push(state.active!.playerIndex);

    // Set 4: p1 wins → firstToSets 2 → match finished
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));

    expect(setStarters).toEqual([0, 1, 2, 0]);
    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p1");
    expect(state.players[0].setsWon).toBe(2);
    expect(state.players[2].setsWon).toBe(1);
    expect(state.history.completedSets).toHaveLength(4);
  });

  it("resets legsWon at a new set while setsWon persists", () => {
    let state = startPlaying({ setsEnabled: true, firstToLegs: 1, firstToSets: 2 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.players[0].legsWon).toBe(1);
    expect(state.players[0].setsWon).toBe(1);

    state = matchReducer(state, startNextLeg());

    expect(state.players[0].legsWon).toBe(0);
    expect(state.players[0].setsWon).toBe(1);
  });

  it("resets every player's score at each new leg", () => {
    let state = startPlaying({ firstToLegs: 3 });
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.players[0].score).toBe(441);
    expect(state.players[1].score).toBe(0);

    state = matchReducer(state, startNextLeg());

    expect(state.players.every((p) => p.score === 501)).toBe(true);
  });

  it("walks the status chain through a full match", () => {
    const statuses: string[] = [];
    let state = startPlaying({ firstToLegs: 2 });
    statuses.push(state.status);

    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    statuses.push(state.status);
    state = matchReducer(state, startNextLeg());
    statuses.push(state.status);
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // p2 wins leg 2
    statuses.push(state.status);
    state = matchReducer(state, startNextLeg());
    statuses.push(state.status);
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // p1 wins leg 3
    statuses.push(state.status);

    expect(statuses).toEqual([
      "playing",
      "leg_finished",
      "playing",
      "leg_finished",
      "playing",
      "match_finished",
    ]);
  });
});

// [6] startNextLeg edges: guards, snapshot/undo across the boundary, new sets
describe("startNextLeg — edges", () => {
  it("is a no-op when active is null", () => {
    let state = startPlaying();
    state = matchReducer(state, abandonMatch());

    state = matchReducer(state, startNextLeg());

    expect(state.status).toBe("setup");
    expect(state.active).toBeNull();
    expect(state.snapshots).toHaveLength(0);
  });

  it("is a no-op at match_finished", () => {
    let state = startPlaying({ firstToLegs: 1 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("match_finished");
    const legId = state.active!.currentLeg.id;

    state = matchReducer(state, startNextLeg());

    expect(state.active!.currentLeg.id).toBe(legId);
    expect(state.status).toBe("match_finished");
    expect(state.snapshots).toHaveLength(1);
  });

  it("takes a snapshot so undo can cross the leg boundary", () => {
    let state = startPlaying({ firstToLegs: 2 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.snapshots).toHaveLength(1);

    state = matchReducer(state, startNextLeg());
    expect(state.snapshots).toHaveLength(2);
    expect(state.status).toBe("playing");

    state = matchReducer(state, undo());
    expect(state.status).toBe("leg_finished");
    expect(state.lastLegWinnerId).toBe("p1");
    expect(state.players[0].score).toBe(0);
  });

  it("starts a new set with the next player in a 3-player match", () => {
    let state = startPlaying(
      { setsEnabled: true, firstToLegs: 1, firstToSets: 2 },
      threePlayers
    );
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // p1 wins set 1
    expect(state.history.completedSets).toHaveLength(1);

    state = matchReducer(state, startNextLeg());

    // completedSets 1 % 3 = 1 → p2 starts set 2
    expect(state.active!.playerIndex).toBe(1);
    expect(state.players.every((p) => p.legsWon === 0)).toBe(true);
  });

  it("clears lastLegWinnerId", () => {
    let state = startPlaying({ firstToLegs: 2 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.lastLegWinnerId).toBe("p1");

    state = matchReducer(state, startNextLeg());
    expect(state.lastLegWinnerId).toBeNull();
  });

  it("records the start player index on the new leg", () => {
    let state = startPlaying();
    expect(state.active!.currentLeg.startPlayerIndex).toBe(0);

    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    state = matchReducer(state, startNextLeg());

    expect(state.active!.currentLeg.startPlayerIndex).toBe(1);
    expect(state.active!.currentLeg.startScore).toBe(501);
  });
});

// [7] Deep undo: across leg/match boundaries, restores, no-ops, selector transitions
describe("undo — deep states", () => {
  it("restores playing state after undoing a leg win", () => {
    let state = startPlaying({ firstToLegs: 2 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("leg_finished");
    expect(state.players[0].legsWon).toBe(1);

    state = matchReducer(state, undo());

    expect(state.status).toBe("playing");
    expect(state.players[0].legsWon).toBe(0);
    expect(state.players[0].score).toBe(501);
    expect(state.lastLegWinnerId).toBeNull();
    expect(state.active!.currentLeg.turns).toHaveLength(0);
    expect(state.snapshots).toHaveLength(0);
  });

  it("restores playing state after undoing a match finish", () => {
    let state = startPlaying({ firstToLegs: 1 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p1");

    state = matchReducer(state, undo());

    expect(state.status).toBe("playing");
    expect(state.winnerId).toBeNull();
    expect(state.players[0].score).toBe(501);
  });

  it("undoes across a startNextLeg boundary back to the finished leg", () => {
    let state = startPlaying({ firstToLegs: 2 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    state = matchReducer(state, startNextLeg());
    expect(state.status).toBe("playing");

    state = matchReducer(state, undo());
    expect(state.status).toBe("leg_finished");
    expect(state.lastLegWinnerId).toBe("p1");

    state = matchReducer(state, undo());
    expect(state.status).toBe("playing");
    expect(state.players[0].score).toBe(501);
    expect(state.snapshots).toHaveLength(0);
  });

  it("allows a re-submit after undoing a bust", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 600 })); // bust
    expect(state.players[0].totalDartsThrown).toBe(0); // dartsUsed omitted → 0

    state = matchReducer(state, undo());
    expect(state.players[0].totalDartsThrown).toBe(0);

    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    expect(state.players[0].score).toBe(441);
    expect(state.active!.playerIndex).toBe(1);
  });

  it("returns to the initial state after a 3-turn undo chain", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    expect(state.snapshots).toHaveLength(3);

    state = matchReducer(state, undo());
    state = matchReducer(state, undo());
    state = matchReducer(state, undo());

    expect(state.players[0].score).toBe(501);
    expect(state.players[1].score).toBe(501);
    expect(state.active!.playerIndex).toBe(0);
    expect(state.snapshots).toHaveLength(0);
  });

  it("restores completedSets when undoing a set win", () => {
    let state = startPlaying({ setsEnabled: true, firstToLegs: 1, firstToSets: 2 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // p1 wins set 1
    expect(state.history.completedSets).toHaveLength(1);
    state = matchReducer(state, startNextLeg());
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // p2 wins set 2
    expect(state.history.completedSets).toHaveLength(2);

    state = matchReducer(state, undo());

    expect(state.status).toBe("playing");
    expect(state.history.completedSets).toHaveLength(1);
    expect(state.players[1].setsWon).toBe(0);
    expect(state.players[1].score).toBe(501);
  });

  it("is a no-op after abandon cleared the snapshots", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    state = matchReducer(state, abandonMatch());
    expect(state.snapshots).toHaveLength(0);

    state = matchReducer(state, undo());

    expect(state.status).toBe("setup");
    expect(state.active).toBeNull();
  });

  it("is a no-op after rematch cleared the snapshots", () => {
    let state = startPlaying({ firstToLegs: 1 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    state = matchReducer(state, rematch());
    expect(state.snapshots).toHaveLength(0);

    state = matchReducer(state, undo());

    expect(state.status).toBe("playing");
    expect(state.active?.playerIndex).toBe(1); // rematch state intact
  });

  it("restores lastLegWinnerId after undoing a startNextLeg", () => {
    let state = startPlaying({ firstToLegs: 2 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.lastLegWinnerId).toBe("p1");
    state = matchReducer(state, startNextLeg());
    expect(state.lastLegWinnerId).toBeNull();

    state = matchReducer(state, undo());

    expect(state.lastLegWinnerId).toBe("p1");
    expect(state.status).toBe("leg_finished");
  });

  it("drives selectCanUndo through leg win, startNextLeg and undo", () => {
    let state = startPlaying({ firstToLegs: 2 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(selectCanUndo(asRootState(state))).toBe(true);

    state = matchReducer(state, startNextLeg());
    expect(selectCanUndo(asRootState(state))).toBe(true);

    state = matchReducer(state, undo());
    expect(selectCanUndo(asRootState(state))).toBe(true);

    state = matchReducer(state, undo());
    expect(selectCanUndo(asRootState(state))).toBe(false);
  });
});

// [8] Rotation: multi-player cycles, bust skips, single player, across legs
describe("turn rotation", () => {
  it("cycles through 3 players for two full rounds", () => {
    let state = startPlaying({}, threePlayers);
    for (let i = 0; i < 6; i++) {
      state = matchReducer(state, submitTurn({ score: 1, dartsUsed: 1 }));
    }

    expect(state.active!.playerIndex).toBe(0);
    // Two turns each: 501 - 2 = 499 per player
    expect(state.players.map((p) => p.score)).toEqual([499, 499, 499]);
  });

  it("cycles through 4 players back to the first", () => {
    let state = startPlaying({}, fourPlayers);
    for (let i = 0; i < 4; i++) {
      state = matchReducer(state, submitTurn({ score: 1, dartsUsed: 1 }));
    }

    expect(state.active!.playerIndex).toBe(0);
  });

  it("skips a busted player with 3 players", () => {
    let state = startPlaying({}, threePlayers);
    state = matchReducer(state, submitTurn({ score: 600 })); // p1 busts
    expect(state.active!.playerIndex).toBe(1);
    state = matchReducer(state, submitTurn({ score: 600 })); // p2 busts
    expect(state.active!.playerIndex).toBe(2);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p3 normal
    expect(state.active!.playerIndex).toBe(0);
    expect(state.players[2].score).toBe(441);
  });

  it("restores the previous player index after undo", () => {
    let state = startPlaying({}, threePlayers);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    expect(state.active!.playerIndex).toBe(1);

    state = matchReducer(state, undo());
    expect(state.active!.playerIndex).toBe(0);
  });

  it("keeps a single player as the active player", () => {
    let state = startPlaying({}, singlePlayer);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));

    expect(state.active!.playerIndex).toBe(0);
    expect(state.active!.currentLeg.turns).toHaveLength(1);
  });

  it("lets a single player win the leg and start the next one", () => {
    let state = startPlaying({ firstToLegs: 2 }, singlePlayer);
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("leg_finished");
    expect(state.lastLegWinnerId).toBe("p1");

    state = matchReducer(state, startNextLeg());
    expect(state.status).toBe("playing");
    expect(state.active!.playerIndex).toBe(0);
  });

  it("continues rotation across a leg boundary with 3 players", () => {
    let state = startPlaying({ firstToLegs: 3 }, threePlayers);
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // p1 wins leg 1
    state = matchReducer(state, startNextLeg());
    expect(state.active!.playerIndex).toBe(1);

    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p2
    expect(state.active!.playerIndex).toBe(2);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p3
    expect(state.active!.playerIndex).toBe(0);
  });

  it("keeps the playerIndex on the winner until startNextLeg", () => {
    let state = startPlaying({ firstToLegs: 3 }, threePlayers);
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("leg_finished");
    expect(state.active!.playerIndex).toBe(0); // winner still active

    state = matchReducer(state, startNextLeg());
    expect(state.active!.playerIndex).toBe(1);
  });
});

// [9] Rematch: order, settings, winner+1 start, history/snapshot clearing
describe("rematch — variations", () => {
  it("keeps the player order of a 3-player match", () => {
    let state = startPlaying({ firstToLegs: 1 }, threePlayers);
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    state = matchReducer(state, rematch());

    expect(state.players.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
    expect(state.players.map((p) => p.order)).toEqual([1, 2, 3]);
  });

  it("keeps setsEnabled settings but resets set state", () => {
    let state = startPlaying({ setsEnabled: true, firstToLegs: 1, firstToSets: 2 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // p1 set 1
    state = matchReducer(state, startNextLeg());
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // p2 set 2
    state = matchReducer(state, startNextLeg());
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // p1 set 3 → match
    expect(state.status).toBe("match_finished");

    state = matchReducer(state, rematch());

    expect(state.settings.setsEnabled).toBe(true);
    expect(state.history.completedSets).toEqual([]);
    expect(state.players.every((p) => p.setsWon === 0 && p.legsWon === 0)).toBe(
      true
    );
  });

  it("starts with the player after the winner in a 3-player match", () => {
    let state = startPlaying({ firstToLegs: 1 }, threePlayers);
    // Let p2 (index 1) win: p1 throws, then p2 checks out
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.winnerId).toBe("p2");

    state = matchReducer(state, rematch());

    expect(state.active!.playerIndex).toBe(2);
  });

  it("clears snapshots and history", () => {
    let state = startPlaying({ firstToLegs: 1 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.snapshots).toHaveLength(1);

    state = matchReducer(state, rematch());

    expect(state.snapshots).toEqual([]);
    expect(state.history.completedSets).toEqual([]);
  });

  it("keeps custom settings", () => {
    let state = startPlaying({
      startingScore: 301,
      firstToLegs: 1,
      checkout: "straight",
    });
    state = matchReducer(state, submitTurn({ score: 301, dartsUsed: 3 }));
    expect(state.status).toBe("match_finished");

    state = matchReducer(state, rematch());

    expect(state.settings).toMatchObject({
      startingScore: 301,
      firstToLegs: 1,
      firstToSets: 1,
      setsEnabled: false,
      checkout: "straight",
      randomOrder: false,
    });
  });

  it("wraps the start index with 4 players", () => {
    let state = startPlaying({ firstToLegs: 1 }, fourPlayers);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p1
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p2
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p3
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // p4 wins
    expect(state.winnerId).toBe("p4");

    state = matchReducer(state, rematch());

    expect(state.active!.playerIndex).toBe(0); // (3 + 1) % 4
  });

  it("starts at index 0 when there is no winner", () => {
    let state = startPlaying();
    state = matchReducer(state, rematch());

    expect(state.active!.playerIndex).toBe(0);
  });
});

// [10] Abandon & resume: mid-leg / leg_finished / match_finished, resume predicate
describe("abandonMatch and resume predicate", () => {
  it("abandons mid-leg", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));

    state = matchReducer(state, abandonMatch());

    expect(state.status).toBe("setup");
    expect(state.active).toBeNull();
  });

  it("abandons at leg_finished", () => {
    let state = startPlaying({ firstToLegs: 2 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("leg_finished");

    state = matchReducer(state, abandonMatch());

    expect(state.status).toBe("setup");
    expect(state.active).toBeNull();
  });

  it("abandons at match_finished", () => {
    let state = startPlaying({ firstToLegs: 1 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("match_finished");

    state = matchReducer(state, abandonMatch());

    expect(state.status).toBe("setup");
    expect(state.active).toBeNull();
    expect(state.snapshots).toEqual([]);
  });

  it("resume predicate is true mid-match", () => {
    const state = startPlaying();

    expect(canResume(state)).toBe(true);
  });

  it("resume predicate is false after abandon", () => {
    let state = startPlaying();
    state = matchReducer(state, abandonMatch());

    expect(canResume(state)).toBe(false);
  });

  it("resume predicate is false at match_finished", () => {
    let state = startPlaying({ firstToLegs: 1 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));

    expect(canResume(state)).toBe(false);
  });

  it("resume predicate is false at leg_finished", () => {
    let state = startPlaying({ firstToLegs: 2 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));

    expect(canResume(state)).toBe(false);
  });

  it("abandon preserves players and settings", () => {
    let state = startPlaying({ startingScore: 301 });
    const playersBefore = JSON.parse(JSON.stringify(state.players));
    const settingsBefore = JSON.parse(JSON.stringify(state.settings));

    state = matchReducer(state, abandonMatch());

    expect(JSON.parse(JSON.stringify(state.players))).toEqual(playersBefore);
    expect(JSON.parse(JSON.stringify(state.settings))).toEqual(settingsBefore);
  });
});

// [11] Bookkeeping: points, darts, per-leg turns, full-match stats, stable order
describe("bookkeeping", () => {
  it("accumulates totalPointsScored across a player's turns", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p1
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p2
    state = matchReducer(state, submitTurn({ score: 40, dartsUsed: 3 })); // p1

    expect(state.players[0].totalPointsScored).toBe(100);
    expect(state.players[1].totalPointsScored).toBe(60);
  });

  it("adds 0 points for bust turns", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 600 })); // p1 bust
    expect(state.players[0].totalPointsScored).toBe(0);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p2
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p1

    expect(state.players[0].totalPointsScored).toBe(60);
  });

  it("accumulates totalDartsThrown across turns", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p1
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p2
    state = matchReducer(state, submitTurn({ score: 40, dartsUsed: 2 })); // p1
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p2
    state = matchReducer(state, submitTurn({ score: 20, dartsUsed: 1 })); // p1

    expect(state.players[0].totalDartsThrown).toBe(6); // 3 + 2 + 1
    expect(state.players[1].totalDartsThrown).toBe(6); // 3 + 3
  });

  it("adds 3 darts for a mid-match bust on top of prior darts", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p1
    state = matchReducer(state, submitTurn({ score: 600, dartsUsed: 3 })); // p2 bust
    expect(state.players[1].totalDartsThrown).toBe(3);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p1
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p2

    expect(state.players[1].totalDartsThrown).toBe(6);
  });

  it("keeps per-leg turn arrays separated across legs", () => {
    let state = startPlaying({ firstToLegs: 2 });
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p1
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // p2 wins leg 1
    expect(state.active!.currentLeg.turns).toHaveLength(2);
    const leg1Turns = state.active!.currentLeg.turns;

    state = matchReducer(state, startNextLeg());

    expect(state.active!.currentLeg.turns).toEqual([]);
    expect(state.active!.currentSet.legs[0].turns).toEqual(leg1Turns);
    expect(state.active!.currentSet.legs[0].winnerId).toBe("p2");
  });

  it("records a player's full-match stats in a 2-0 match", () => {
    let state = startPlaying({ firstToLegs: 2 });
    // Leg 1: p1 checks out
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    state = matchReducer(state, startNextLeg());
    // Leg 2: p2 busts (3 darts), then p1 checks out → 2-0
    state = matchReducer(state, submitTurn({ score: 600, dartsUsed: 3 }));
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));

    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p1");
    expect(state.players[0].legsWon).toBe(2);
    expect(state.players[0].totalPointsScored).toBe(1002);
    expect(state.players[0].totalDartsThrown).toBe(6);
    expect(state.players[1].totalPointsScored).toBe(0);
    expect(state.players[1].totalDartsThrown).toBe(3);
  });

  it("keeps player order stable across turns and legs", () => {
    let state = startPlaying({ firstToLegs: 2 }, threePlayers);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p1
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p2
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p3
    state = matchReducer(state, submitTurn({ score: 441, dartsUsed: 3 })); // p1 wins leg 1
    state = matchReducer(state, startNextLeg());
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p2 in leg 2

    expect(state.players.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
    expect(state.players.map((p) => p.order)).toEqual([1, 2, 3]);
  });

  it("records the correct playerId on each turn in a leg", () => {
    let state = startPlaying({}, threePlayers);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));

    expect(state.active!.currentLeg.turns.map((t) => t.playerId)).toEqual([
      "p1",
      "p2",
      "p3",
    ]);
  });
});

// [12] Store integration: real store dispatch, getState, selectCanUndo, full match
describe("store integration", () => {
  it("dispatches startMatch through the real store", () => {
    store.dispatch(startMatch(startPayload({ startingScore: 301 })));
    const s = store.getState().match;

    expect(s.status).toBe("playing");
    expect(s.active).not.toBeNull();
    expect(s.players.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(s.players.every((p) => p.score === 301)).toBe(true);
  });

  it("reflects submitTurn in getState", () => {
    store.dispatch(startMatch(startPayload()));
    store.dispatch(submitTurn({ score: 60, dartsUsed: 3 }));
    const s = store.getState().match;

    expect(s.players[0].score).toBe(441);
    expect(s.snapshots).toHaveLength(1);
  });

  it("restores state via undo through the real store", () => {
    store.dispatch(startMatch(startPayload()));
    store.dispatch(submitTurn({ score: 60, dartsUsed: 3 }));
    store.dispatch(undo());
    const s = store.getState().match;

    expect(s.players[0].score).toBe(501);
    expect(s.snapshots).toHaveLength(0);
  });

  it("abandons through the real store", () => {
    store.dispatch(startMatch(startPayload()));
    store.dispatch(submitTurn({ score: 60, dartsUsed: 3 }));
    store.dispatch(abandonMatch());
    const s = store.getState().match;

    expect(s.status).toBe("setup");
    expect(s.active).toBeNull();
    expect(s.snapshots).toEqual([]);
  });

  it("evaluates the real selectCanUndo against the store state", () => {
    store.dispatch(startMatch(startPayload()));
    expect(selectCanUndo(store.getState())).toBe(false);
    store.dispatch(submitTurn({ score: 60, dartsUsed: 3 }));
    expect(selectCanUndo(store.getState())).toBe(true);
    store.dispatch(undo());
    expect(selectCanUndo(store.getState())).toBe(false);
  });

  it("plays a full match to match_finished through the store", () => {
    store.dispatch(startMatch(startPayload({ firstToLegs: 2 })));
    store.dispatch(submitTurn({ score: 501, dartsUsed: 3 })); // p1 wins leg 1
    expect(store.getState().match.status).toBe("leg_finished");
    store.dispatch(startNextLeg());
    store.dispatch(submitTurn({ score: 600 })); // p2 busts in leg 2
    store.dispatch(submitTurn({ score: 501, dartsUsed: 3 })); // p1 wins leg 2 → match
    const s = store.getState().match;

    expect(s.status).toBe("match_finished");
    expect(s.winnerId).toBe("p1");
    expect(s.players[0].legsWon).toBe(2);
  });
});

// Value edges: 180 max turn, odd double-out, zero-dart checkout, negative scores
describe("value edges", () => {
  it("records a maximum 180 turn exactly", () => {
    const state = matchReducer(startPlaying(), submitTurn({ score: 180, dartsUsed: 3 }));
    const turn = state.active!.currentLeg.turns[0];

    expect(turn.points).toBe(180);
    expect(turn.dartsUsed).toBe(3);
    expect(state.players[0].score).toBe(321);
    expect(state.players[0].totalPointsScored).toBe(180);
  });

  it("wins the leg from remaining 3 with double checkout (no double-out enforcement)", () => {
    // Behavior snapshot: the reducer only special-cases remaining === 1;
    // a throw equal to the remaining score always wins, even odd values.
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 498, dartsUsed: 3 })); // p1 → 3
    expect(state.players[0].score).toBe(3);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p2
    state = matchReducer(state, submitTurn({ score: 3, dartsUsed: 2 })); // p1 checks out

    expect(state.status).toBe("leg_finished");
    expect(state.lastLegWinnerId).toBe("p1");
    expect(state.active!.currentLeg.turns[2].dartsUsed).toBe(2);
  });

  it("busts when overshooting the current score mid-leg", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p1 → 441
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p2
    state = matchReducer(state, submitTurn({ score: 442, dartsUsed: 3 })); // overshoot by 1

    expect(state.active!.currentLeg.turns[2].isBust).toBe(true);
    expect(state.players[0].score).toBe(441);
  });

  it("wins the leg on an exact checkout even with dartsUsed omitted", () => {
    const state = matchReducer(startPlaying(), submitTurn({ score: 501 }));

    expect(state.status).toBe("leg_finished");
    expect(state.active!.currentLeg.turns[0].dartsUsed).toBe(0);
    expect(state.players[0].totalDartsThrown).toBe(0);
  });

  it("accepts a negative score without busting (behavior snapshot)", () => {
    const state = matchReducer(startPlaying(), submitTurn({ score: -5, dartsUsed: 3 }));
    const turn = state.active!.currentLeg.turns[0];

    expect(turn.isBust).toBe(false);
    expect(turn.points).toBe(-5);
    expect(state.players[0].score).toBe(506);
  });
});

// [13] G1: Bogie exact-score behavior snapshot. The reducer has NO finishability
//     guard: any throw equal to the remaining score wins the leg, even for bogie
//     scores like 169 (not a finishable checkout with 3 darts). This is why the
//     NumberPad blocks exact-score entry for non-finishable scores — the UI
//     enforces it, the reducer deliberately does not (UI-only enforcement).
describe("G1 — bogie exact-score behavior snapshot", () => {
  it("wins the leg from remaining 169 in double mode (bogie score, no finishability guard)", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 332, dartsUsed: 3 })); // p1 → 169
    expect(state.players[0].score).toBe(169);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p2
    state = matchReducer(state, submitTurn({ score: 169, dartsUsed: 3 })); // p1 finishes

    expect(state.status).toBe("leg_finished");
    expect(state.lastLegWinnerId).toBe("p1");
    expect(state.winnerId).toBeNull(); // firstToLegs 3 → not match_finished
    expect(state.players[0].score).toBe(0);
    // Intended UI-only enforcement: the NumberPad blocks exact-score entry for
    // non-finishable (bogie) scores like 169; the reducer accepts them.
  });

  it("checks out exactly from remaining 170 (T20+T20+Bull path conceptually)", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 331, dartsUsed: 3 })); // p1 → 170
    expect(state.players[0].score).toBe(170);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p2
    state = matchReducer(state, submitTurn({ score: 170, dartsUsed: 3 })); // p1 checks out

    expect(state.status).toBe("leg_finished");
    expect(state.lastLegWinnerId).toBe("p1");
    expect(state.active!.currentLeg.turns[2].points).toBe(170);
    expect(state.players[0].totalDartsThrown).toBe(6); // 3 + 3
  });

  it("records full turn fields on the bogie 169 exact-score finish", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 332, dartsUsed: 3 }));
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    state = matchReducer(state, submitTurn({ score: 169, dartsUsed: 2 }));

    const turn = state.active!.currentLeg.turns[2];
    expect(turn.playerId).toBe("p1");
    expect(turn.points).toBe(169);
    expect(turn.isBust).toBe(false);
    expect(turn.dartsUsed).toBe(2);
    expect(turn.remainingScore).toBe(0);
    expect(state.players[0].totalDartsThrown).toBe(5); // 3 + 2
  });

  it("lets a non-starter win the leg with an exact bogie score", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p1
    state = matchReducer(state, submitTurn({ score: 332, dartsUsed: 3 })); // p2 → 169
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p1
    state = matchReducer(state, submitTurn({ score: 169, dartsUsed: 3 })); // p2 finishes

    expect(state.status).toBe("leg_finished");
    expect(state.lastLegWinnerId).toBe("p2");
    expect(state.players[1].score).toBe(0);
  });

  it("reaches match_finished via a bogie exact finish on the second leg win", () => {
    let state = startPlaying({ firstToLegs: 2 });
    // Leg 1: p1 wins with a bogie 169 finish
    state = matchReducer(state, submitTurn({ score: 332, dartsUsed: 3 }));
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    state = matchReducer(state, submitTurn({ score: 169, dartsUsed: 3 }));
    expect(state.status).toBe("leg_finished");
    state = matchReducer(state, startNextLeg());
    // Leg 2: p2 busts, then p1 wins again with 169 → firstToLegs 2
    state = matchReducer(state, submitTurn({ score: 600 }));
    state = matchReducer(state, submitTurn({ score: 332, dartsUsed: 3 }));
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    state = matchReducer(state, submitTurn({ score: 169, dartsUsed: 3 }));

    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p1");
    expect(state.players[0].legsWon).toBe(2);
  });

  it("wins from a bogie 169 with straight checkout too (checkout mode does not gate finishes)", () => {
    let state = startPlaying({ checkout: "straight" });
    state = matchReducer(state, submitTurn({ score: 332, dartsUsed: 3 }));
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    state = matchReducer(state, submitTurn({ score: 169, dartsUsed: 3 }));

    expect(state.status).toBe("leg_finished");
    expect(state.lastLegWinnerId).toBe("p1");
    expect(state.active!.currentLeg.turns[2].isBust).toBe(false);
  });
});

// [14] G2: Snapshot cap rollover — takeSnapshotState keeps the 20 most recent
//     snapshots and drops the OLDEST (shift after push).
describe("G2 — snapshot cap rollover", () => {
  // Deep-compare helper that ignores the snapshot stack (undo pops it by design).
  const withoutSnapshots = (state: MatchState): MatchState => {
    const clone: MatchState = JSON.parse(JSON.stringify(state));
    clone.snapshots = [];
    return clone;
  };

  it("rolls the 20-snapshot cap over by dropping the oldest snapshot", () => {
    let state = startPlaying();
    const preFirstSubmit = withoutSnapshots(state);
    state = matchReducer(state, submitTurn({ score: 1, dartsUsed: 1 }));
    const postFirstSubmit = withoutSnapshots(state);

    for (let i = 1; i < 21; i++) {
      state = matchReducer(state, submitTurn({ score: 1, dartsUsed: 1 }));
    }
    expect(state.snapshots).toHaveLength(20);
    expect(selectCanUndo(asRootState(state))).toBe(true);

    // The pre-first-submit state was the OLDEST snapshot and was dropped by the
    // cap, so the deepest undo restores the state AFTER the 1st submit, not before.
    for (let i = 0; i < 20; i++) {
      state = matchReducer(state, undo());
    }
    expect(state.snapshots).toHaveLength(0);
    expect(selectCanUndo(asRootState(state))).toBe(false);
    expect(withoutSnapshots(state)).toEqual(postFirstSubmit);
    expect(withoutSnapshots(state)).not.toEqual(preFirstSubmit);
  });

  it("is a no-op on the 21st undo once the rollover window is fully unwound", () => {
    let state = startPlaying();
    for (let i = 0; i < 21; i++) {
      state = matchReducer(state, submitTurn({ score: 1, dartsUsed: 1 }));
    }
    for (let i = 0; i < 20; i++) {
      state = matchReducer(state, undo());
    }
    expect(state.snapshots).toHaveLength(0);

    const before = JSON.parse(JSON.stringify(state));
    state = matchReducer(state, undo());
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(selectCanUndo(asRootState(state))).toBe(false);
  });

  it("keeps exactly 20 snapshots through 30 submits", () => {
    let state = startPlaying();
    for (let i = 0; i < 30; i++) {
      state = matchReducer(state, submitTurn({ score: 1, dartsUsed: 1 }));
    }

    expect(state.snapshots).toHaveLength(20);
    expect(selectCanUndo(asRootState(state))).toBe(true);
    expect(state.players.map((p) => p.score)).toEqual([486, 486]); // 15 turns each
    expect(state.active!.currentLeg.turns).toHaveLength(30);
  });

  it("rolls the cap over across a leg boundary (startNextLeg snapshots count too)", () => {
    let state = startPlaying({ firstToLegs: 2 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // leg 1 win
    state = matchReducer(state, startNextLeg());
    const afterBoundary = withoutSnapshots(state);
    expect(state.active!.playerIndex).toBe(1);

    for (let i = 0; i < 20; i++) {
      state = matchReducer(state, submitTurn({ score: 1, dartsUsed: 1 }));
    }
    // 22 actions total (2 + 20) → capped to the 20 most recent
    expect(state.snapshots).toHaveLength(20);

    for (let i = 0; i < 20; i++) {
      state = matchReducer(state, undo());
    }
    // The two pre-boundary snapshots were dropped: the deepest restore is the
    // post-startNextLeg state, so undo still walks the full boundary.
    expect(withoutSnapshots(state)).toEqual(afterBoundary);
    expect(state.status).toBe("playing");
    expect(state.active!.playerIndex).toBe(1);
  });

  it("leaves the first submit on the board after rollover + full undo (oldest action not undoable)", () => {
    let state = startPlaying();
    for (let i = 0; i < 21; i++) {
      state = matchReducer(state, submitTurn({ score: 1, dartsUsed: 1 }));
    }
    for (let i = 0; i < 20; i++) {
      state = matchReducer(state, undo());
    }

    expect(state.active!.currentLeg.turns).toHaveLength(1);
    expect(state.active!.currentLeg.turns[0].points).toBe(1);
    expect(state.snapshots).toHaveLength(0);
  });
});

// [15] G3: Undo chains across leg/set boundaries in sets-enabled matches
describe("G3 — undo chains across set boundaries", () => {
  it("walks a 3-undo chain back through a set boundary to mid-leg", () => {
    let state = startPlaying({ setsEnabled: true, firstToLegs: 2, firstToSets: 2 });
    // Set 1, leg 1: p1 wins
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    state = matchReducer(state, startNextLeg());
    // Set 1, leg 2: p2 busts, p1 wins → p1 legsWon 2 → set 1 finished (setsWon 1)
    state = matchReducer(state, submitTurn({ score: 600 }));
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.players[0].setsWon).toBe(1);
    expect(state.history.completedSets).toHaveLength(1);
    expect(state.status).toBe("leg_finished"); // not match over until setsWon 2

    // Set 2 starts with p2
    state = matchReducer(state, startNextLeg());
    expect(state.active!.playerIndex).toBe(1);
    // Set 2, leg 1: p2 wins
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("leg_finished");

    // Undo 1 → playing mid-set-2-leg-1 (the startNextLeg snapshot was restored)
    state = matchReducer(state, undo());
    expect(state.status).toBe("playing");
    expect(state.active!.playerIndex).toBe(1);
    expect(state.players.every((p) => p.score === 501)).toBe(true);
    expect(state.players[0].setsWon).toBe(1);
    expect(state.history.completedSets).toHaveLength(1);
    expect(state.players.every((p) => p.legsWon === 0)).toBe(true); // set-2 legs reset

    // Undo 2 → leg_finished after set 1 (boundary state, completedSets intact)
    state = matchReducer(state, undo());
    expect(state.status).toBe("leg_finished");
    expect(state.lastLegWinnerId).toBe("p1");
    expect(state.players[0].legsWon).toBe(2);
    expect(state.players[0].setsWon).toBe(1);
    expect(state.history.completedSets).toHaveLength(1);

    // Undo 3 → mid-leg-2 of set 1: undoing before the set-finishing leg
    // removes that set from history.completedSets
    state = matchReducer(state, undo());
    expect(state.status).toBe("playing");
    expect(state.history.completedSets).toHaveLength(0);
    expect(state.players[0].setsWon).toBe(0);
    expect(state.players[0].legsWon).toBe(1);
    expect(state.players[1].legsWon).toBe(0);
    expect(state.active!.playerIndex).toBe(0); // p1's turn in leg 2 of set 1
    expect(state.players[0].score).toBe(501);
  });

  it("restores playing state and clears the winner after undoing a sets-enabled match finish", () => {
    let state = startPlaying({ setsEnabled: true, firstToLegs: 1, firstToSets: 1 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p1");
    expect(state.history.completedSets).toHaveLength(1);

    state = matchReducer(state, undo());

    expect(state.status).toBe("playing");
    expect(state.winnerId).toBeNull();
    expect(state.players[0].setsWon).toBe(0);
    expect(state.history.completedSets).toHaveLength(0);
    expect(state.players[0].score).toBe(501);
  });

  it("lets the other player win after undoing a sets-enabled match finish", () => {
    let state = startPlaying({ setsEnabled: true, firstToLegs: 1, firstToSets: 1 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    state = matchReducer(state, undo());
    expect(state.status).toBe("playing");

    // p2 (not p1) checks out instead → p2 wins the set and the match
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));

    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p2");
    expect(state.players[1].setsWon).toBe(1);
    expect(state.history.completedSets).toHaveLength(1);
  });

  it("unwinds the full set-bounded chain back to the initial playing state", () => {
    let state = startPlaying({ setsEnabled: true, firstToLegs: 2, firstToSets: 2 });
    // Leg 1: p1 wins → startNextLeg → leg 2: p2 busts, p1 wins → set 1
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    state = matchReducer(state, startNextLeg());
    state = matchReducer(state, submitTurn({ score: 600 }));
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    // startNextLeg into set 2 → leg 1 of set 2: p2 wins
    state = matchReducer(state, startNextLeg());
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));

    // 6 snapshots were taken (4 submits + 2 startNextLegs) → 6 undos unwind all
    expect(state.snapshots).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      state = matchReducer(state, undo());
    }
    expect(state.snapshots).toHaveLength(0);
    expect(state.status).toBe("playing");
    expect(state.active!.playerIndex).toBe(0);
    expect(state.players.every((p) => p.score === 501)).toBe(true);
    expect(state.players.every((p) => p.legsWon === 0 && p.setsWon === 0)).toBe(true);
    expect(state.history.completedSets).toHaveLength(0);

    // 7th undo: no-op
    const before = JSON.parse(JSON.stringify(state));
    state = matchReducer(state, undo());
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
  });

  it("restores lastLegWinnerId correctly at each step of the chain", () => {
    let state = startPlaying({ setsEnabled: true, firstToLegs: 2, firstToSets: 2 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // leg 1: p1
    expect(state.lastLegWinnerId).toBe("p1");
    state = matchReducer(state, startNextLeg());
    expect(state.lastLegWinnerId).toBeNull();
    state = matchReducer(state, submitTurn({ score: 600 })); // p2 bust
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // leg 2: p1 → set 1
    expect(state.lastLegWinnerId).toBe("p1");
    state = matchReducer(state, startNextLeg());
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // set 2 leg 1: p2

    // Undo 1 → mid set-2-leg-1: startNextLeg cleared the winner id
    state = matchReducer(state, undo());
    expect(state.lastLegWinnerId).toBeNull();
    // Undo 2 → leg_finished after set 1: p1 is the last leg winner
    state = matchReducer(state, undo());
    expect(state.lastLegWinnerId).toBe("p1");
    // Undo 3 → mid leg 2 of set 1: lastLegWinnerId is null until a leg finishes
    state = matchReducer(state, undo());
    expect(state.lastLegWinnerId).toBeNull();
    expect(state.status).toBe("playing");
  });

  it("walks back two undos from a sets-enabled match_finished (firstToLegs 2, firstToSets 1)", () => {
    let state = startPlaying({ setsEnabled: true, firstToLegs: 2, firstToSets: 1 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // leg 1: p1
    state = matchReducer(state, startNextLeg());
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // leg 2: p2
    state = matchReducer(state, startNextLeg());
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // leg 3: p1 → set → match
    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p1");
    expect(state.history.completedSets).toHaveLength(1);

    state = matchReducer(state, undo());
    expect(state.status).toBe("playing");
    expect(state.history.completedSets).toHaveLength(0);
    expect(state.players[0].legsWon).toBe(1);
    expect(state.players[1].legsWon).toBe(1);
    expect(state.active!.playerIndex).toBe(0); // p1 about to throw leg 3

    state = matchReducer(state, undo());
    expect(state.status).toBe("leg_finished");
    expect(state.lastLegWinnerId).toBe("p2");
    expect(state.players[1].legsWon).toBe(1);
    expect(state.history.completedSets).toHaveLength(0);
  });
});

// [16] G4: 3p/4p set rotation matrix — set starters follow completedSetsCount % N
describe("G4 — 3p/4p set rotation matrix", () => {
  it("rotates set starters 0→1→2 across three sets (3 players, firstToLegs 2)", () => {
    let state = startPlaying(
      { setsEnabled: true, firstToLegs: 2, firstToSets: 3 },
      threePlayers
    );
    // Set 1: leg 1 starts player 0
    expect(state.active!.currentLeg.startPlayerIndex).toBe(0);
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // p1 wins leg 1
    state = matchReducer(state, startNextLeg());
    expect(state.active!.currentLeg.startPlayerIndex).toBe(1);

    // Set 1, leg 2: p2 and p3 bust, p1 wins → set 1 to p1 (completedSetsCount 1)
    state = matchReducer(state, submitTurn({ score: 600 }));
    state = matchReducer(state, submitTurn({ score: 600 }));
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.history.completedSets).toHaveLength(1);

    // Set 2 starts player 1 (completedSetsCount 1 % 3)
    state = matchReducer(state, startNextLeg());
    expect(state.active!.currentLeg.startPlayerIndex).toBe(1);

    // Within set 2: leg 2 starts player 2 ((1 + 1) % 3)
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // p2 wins
    state = matchReducer(state, startNextLeg());
    expect(state.active!.currentLeg.startPlayerIndex).toBe(2);

    // Within set 2: leg 3 starts player 0 ((1 + 2) % 3)
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // p3 wins
    state = matchReducer(state, startNextLeg());
    expect(state.active!.currentLeg.startPlayerIndex).toBe(0);

    // Within set 2: leg 4 wraps back to the set starter ((1 + 3) % 3 = 1)
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // p1 wins
    state = matchReducer(state, startNextLeg());
    expect(state.active!.currentLeg.startPlayerIndex).toBe(1);

    // Leg 4 winner p2 → set 2 to p2 (completedSetsCount 2) → set 3 starts player 2
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.history.completedSets).toHaveLength(2);
    state = matchReducer(state, startNextLeg());
    expect(state.active!.currentLeg.startPlayerIndex).toBe(2); // 2 % 3
    expect(state.active!.playerIndex).toBe(2);
  });

  it("rotates 4 players across sets: set 1 starts P0, set 2 starts P1, match ends in set 3", () => {
    let state = startPlaying(
      { setsEnabled: true, firstToLegs: 1, firstToSets: 2 },
      fourPlayers
    );
    // Set 1: first leg starts P0
    expect(state.active!.currentLeg.startPlayerIndex).toBe(0);
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // P0 wins set 1
    state = matchReducer(state, startNextLeg());
    // Set 2: first leg starts P1 (completedSetsCount 1 % 4)
    expect(state.active!.currentLeg.startPlayerIndex).toBe(1);
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // P1 wins set 2

    // Set 3 starts P2; P2, P3, P0 bust so P1 can take set 3 → firstToSets 2
    state = matchReducer(state, startNextLeg());
    expect(state.active!.currentLeg.startPlayerIndex).toBe(2);
    state = matchReducer(state, submitTurn({ score: 600 })); // P2 bust
    state = matchReducer(state, submitTurn({ score: 600 })); // P3 bust
    state = matchReducer(state, submitTurn({ score: 600 })); // P0 bust
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // P1 wins set 3

    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p2"); // Bob (index 1)
    expect(state.players[1].setsWon).toBe(2);
    expect(state.history.completedSets).toHaveLength(3);
  });

  it("wraps 4-player set rotation back to P0 at set 5 (completedSetsCount % 4)", () => {
    let state = startPlaying(
      { setsEnabled: true, firstToLegs: 1, firstToSets: 5 },
      fourPlayers
    );
    const starters: number[] = [state.active!.currentLeg.startPlayerIndex];
    for (let i = 0; i < 4; i++) {
      state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
      state = matchReducer(state, startNextLeg());
      starters.push(state.active!.currentLeg.startPlayerIndex);
    }
    // Sets 1-4 were won by starters P0..P3 → set 5 wraps to P0
    expect(starters).toEqual([0, 1, 2, 3, 0]);
    expect(state.players.map((p) => p.setsWon)).toEqual([1, 1, 1, 1]);
  });

  it("rotates within-set leg starters around 4 players (1,2,3,0) and finishes set 1 on the 5th leg", () => {
    let state = startPlaying(
      { setsEnabled: true, firstToLegs: 2, firstToSets: 2 },
      fourPlayers
    );
    // Set 1: legs 1-4 won by starters P0..P3; leg 5 wraps to P0 who wins set 1
    const legStarters: number[] = [state.active!.currentLeg.startPlayerIndex];
    for (let i = 0; i < 4; i++) {
      state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
      state = matchReducer(state, startNextLeg());
      legStarters.push(state.active!.currentLeg.startPlayerIndex);
    }
    expect(legStarters).toEqual([0, 1, 2, 3, 0]);
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // P0 wins leg 5 → set 1
    expect(state.players[0].setsWon).toBe(1);
    expect(state.history.completedSets).toHaveLength(1);
    state = matchReducer(state, startNextLeg());
    // Set 2 starts P1 and its legs rotate 1,2,3,0
    expect(state.active!.currentLeg.startPlayerIndex).toBe(1);
    const set2Starters: number[] = [state.active!.currentLeg.startPlayerIndex];
    for (let i = 0; i < 3; i++) {
      state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
      state = matchReducer(state, startNextLeg());
      set2Starters.push(state.active!.currentLeg.startPlayerIndex);
    }
    expect(set2Starters).toEqual([1, 2, 3, 0]);
  });

  it("wraps 3-player set rotation back to P0 at set 4 (completedSetsCount % 3)", () => {
    let state = startPlaying(
      { setsEnabled: true, firstToLegs: 1, firstToSets: 4 },
      threePlayers
    );
    const starters: number[] = [state.active!.currentLeg.startPlayerIndex];
    for (let i = 0; i < 3; i++) {
      state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
      state = matchReducer(state, startNextLeg());
      starters.push(state.active!.currentLeg.startPlayerIndex);
    }
    expect(starters).toEqual([0, 1, 2, 0]);
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // P0 wins set 4
    expect(state.players[0].setsWon).toBe(2);
    state = matchReducer(state, startNextLeg());
    expect(state.active!.currentLeg.startPlayerIndex).toBe(1); // 4 % 3
  });
});

// [17] G5: Rematch semantics — settings kept, order preserved, winner+1 start
describe("G5 — rematch semantics (sets + order)", () => {
  it("keeps settings and player order after a sets-enabled rematch (no reshuffle)", () => {
    let state = startPlaying(
      { setsEnabled: true, firstToLegs: 2, firstToSets: 2, randomOrder: true },
      threePlayers
    );
    const orderBefore = state.players.map((p) => p.id);
    // The current first player (s0) wins every leg; everyone else busts.
    // Set 1: leg 1 s0 wins; leg 2 s1, s2 bust → s0 wins → s0 setsWon 1
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    state = matchReducer(state, startNextLeg());
    state = matchReducer(state, submitTurn({ score: 600 }));
    state = matchReducer(state, submitTurn({ score: 600 }));
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    // Set 2: leg 1 s1, s2 bust → s0 wins; leg 2 s2 busts → s0 wins → setsWon 2
    state = matchReducer(state, startNextLeg());
    state = matchReducer(state, submitTurn({ score: 600 }));
    state = matchReducer(state, submitTurn({ score: 600 }));
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    state = matchReducer(state, startNextLeg());
    state = matchReducer(state, submitTurn({ score: 600 }));
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe(state.players[0].id);

    state = matchReducer(state, rematch());

    // Settings kept verbatim (setsEnabled, firstToLegs, firstToSets, startingScore, checkout)
    expect(state.settings).toEqual({
      startingScore: 501,
      firstToLegs: 2,
      firstToSets: 2,
      setsEnabled: true,
      checkout: "double",
      randomOrder: true,
    });
    // Behavior snapshot: rematch does NOT reshuffle — even with randomOrder true
    // the order is preserved; startMatch would have shuffled it.
    expect(state.players.map((p) => p.id)).toEqual(orderBefore);
    expect(state.players.map((p) => p.order)).toEqual([1, 2, 3]);
    // startPlayerIndex = (winnerIndex + 1) % N → winner was index 0
    expect(state.active!.playerIndex).toBe(1);
    expect(state.active!.currentLeg.startPlayerIndex).toBe(1);
    expect(state.players.every((p) => p.score === 501)).toBe(true);
    expect(state.players.every((p) => p.legsWon === 0 && p.setsWon === 0)).toBe(true);
    expect(state.history.completedSets).toEqual([]);
    expect(state.snapshots).toEqual([]);
  });

  it("preserves player colors across rematch", () => {
    let state = startPlaying({ firstToLegs: 1 }, threePlayers);
    const colorsBefore = state.players.map((p) => p.color);
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    state = matchReducer(state, rematch());

    expect(state.players.map((p) => p.color)).toEqual(colorsBefore);
  });

  it("undo is a no-op after a rematch cleared the snapshots (sets-enabled)", () => {
    let state = startPlaying({ setsEnabled: true, firstToLegs: 1, firstToSets: 1 });
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("match_finished");
    state = matchReducer(state, rematch());
    expect(state.snapshots).toEqual([]);

    const before = JSON.parse(JSON.stringify(state));
    state = matchReducer(state, undo());
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(state.status).toBe("playing");
    expect(state.active!.playerIndex).toBe(1); // winner+1 preserved
    expect(selectCanUndo(asRootState(state))).toBe(false);
  });

  it("rematch immediately after startMatch with no turns starts at player 0", () => {
    let state = startPlaying({}, threePlayers);
    state = matchReducer(state, rematch());

    expect(state.status).toBe("playing");
    expect(state.winnerId).toBeNull();
    expect(state.active!.playerIndex).toBe(0);
    expect(state.active!.currentLeg.startPlayerIndex).toBe(0);
    expect(state.snapshots).toEqual([]);
    expect(state.history.completedSets).toEqual([]);
  });

  it("resets all per-player match stats on rematch", () => {
    let state = startPlaying({ firstToLegs: 1 }, threePlayers);
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p1
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 })); // p2
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 })); // p3 wins
    expect(state.players[2].totalPointsScored).toBe(501);

    state = matchReducer(state, rematch());

    expect(state.players.every((p) => p.score === 501)).toBe(true);
    expect(state.players.every((p) => p.legsWon === 0 && p.setsWon === 0)).toBe(true);
    expect(state.players.every((p) => p.totalDartsThrown === 0)).toBe(true);
    expect(state.players.every((p) => p.totalPointsScored === 0)).toBe(true);
    expect(state.active!.playerIndex).toBe(0); // winner was index 2 → (2 + 1) % 3
  });

  it("keeps custom startingScore and checkout across a rematch", () => {
    let state = startPlaying({
      startingScore: 301,
      firstToLegs: 1,
      checkout: "straight",
    });
    state = matchReducer(state, submitTurn({ score: 301, dartsUsed: 3 }));
    expect(state.status).toBe("match_finished");

    state = matchReducer(state, rematch());

    expect(state.settings).toEqual({
      startingScore: 301,
      firstToLegs: 1,
      firstToSets: 1,
      setsEnabled: false,
      checkout: "straight",
      randomOrder: false,
    });
    expect(state.players.every((p) => p.score === 301)).toBe(true);
    expect(state.active!.playerIndex).toBe(1);
  });
});

// [18] G6: dartsUsed edges — values are stored verbatim, NOT clamped by the reducer
describe("G6 — dartsUsed edges", () => {
  it("accepts dartsUsed 4 without clamping (behavior snapshot)", () => {
    // Behavior snapshot: the reducer stores dartsUsed verbatim; values above 3
    // are accepted and added to totalDartsThrown. The UI is expected to cap input.
    const state = matchReducer(startPlaying(), submitTurn({ score: 60, dartsUsed: 4 }));
    const turn = state.active!.currentLeg.turns[0];

    expect(turn.dartsUsed).toBe(4);
    expect(state.players[0].totalDartsThrown).toBe(4);
  });

  it("accepts an explicit dartsUsed of 0 on a normal hit", () => {
    const state = matchReducer(startPlaying(), submitTurn({ score: 60, dartsUsed: 0 }));
    const turn = state.active!.currentLeg.turns[0];

    expect(turn.dartsUsed).toBe(0);
    expect(turn.points).toBe(60);
    expect(state.players[0].totalDartsThrown).toBe(0);
    expect(state.players[0].score).toBe(441);
    expect(state.active!.currentLeg.turns).toHaveLength(1); // turn recorded
  });

  it("counts the actual dartsUsed on an explicit bust (dartsUsed 1)", () => {
    const state = matchReducer(
      startPlaying(),
      submitTurn({ score: 60, isBust: true, dartsUsed: 1 })
    );
    const turn = state.active!.currentLeg.turns[0];

    expect(turn.isBust).toBe(true);
    expect(turn.dartsUsed).toBe(1); // actual darts thrown on the bust
    expect(state.players[0].totalDartsThrown).toBe(1);
    expect(state.players[0].score).toBe(501); // unchanged
  });

  it("stores dartsUsed verbatim on a bust (no 3-dart forcing, no clamping)", () => {
    const state = matchReducer(startPlaying(), submitTurn({ score: 600, dartsUsed: 4 }));
    const turn = state.active!.currentLeg.turns[0];

    expect(turn.isBust).toBe(true);
    expect(turn.dartsUsed).toBe(4);
    expect(state.players[0].totalDartsThrown).toBe(4);
  });

  it("accepts a negative dartsUsed without clamping (behavior snapshot)", () => {
    // Behavior snapshot, mirroring the negative-score acceptance: dartsUsed is
    // summed verbatim, so -1 decrements totalDartsThrown.
    const state = matchReducer(startPlaying(), submitTurn({ score: 60, dartsUsed: -1 }));
    const turn = state.active!.currentLeg.turns[0];

    expect(turn.dartsUsed).toBe(-1);
    expect(state.players[0].totalDartsThrown).toBe(-1);
  });

  it("does not clamp dartsUsed on an exact checkout either (dartsUsed 4 wins the leg)", () => {
    const state = matchReducer(startPlaying(), submitTurn({ score: 501, dartsUsed: 4 }));
    const turn = state.active!.currentLeg.turns[0];

    expect(state.status).toBe("leg_finished");
    expect(turn.dartsUsed).toBe(4);
    expect(state.players[0].totalDartsThrown).toBe(4);
  });

  it("records an explicit dartsUsed of 0 on a bust", () => {
    const state = matchReducer(startPlaying(), submitTurn({ score: 600, dartsUsed: 0 }));
    const turn = state.active!.currentLeg.turns[0];

    expect(turn.isBust).toBe(true);
    expect(turn.dartsUsed).toBe(0);
    expect(state.players[0].totalDartsThrown).toBe(0);
  });
});

// [19] G7: Value edges — non-501 starting scores and explicit bust on exact score
describe("G7 — value edges (301 start, explicit bust)", () => {
  it("starts a 301 match with scores at 301 and decrements on a normal hit", () => {
    let state = startPlaying({ startingScore: 301 });
    expect(state.players.every((p) => p.score === 301)).toBe(true);

    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    const turn = state.active!.currentLeg.turns[0];

    expect(turn.isBust).toBe(false);
    expect(turn.points).toBe(60);
    expect(turn.remainingScore).toBe(241);
    expect(state.players[0].score).toBe(241);
  });

  it("wins the leg on an exact 301 finish and resets scores to 301 for the next leg", () => {
    let state = startPlaying({ startingScore: 301 });
    state = matchReducer(state, submitTurn({ score: 301, dartsUsed: 3 }));

    expect(state.status).toBe("leg_finished");
    expect(state.lastLegWinnerId).toBe("p1");
    expect(state.players[0].score).toBe(0);

    state = matchReducer(state, startNextLeg());
    expect(state.status).toBe("playing");
    expect(state.players.every((p) => p.score === 301)).toBe(true);
    expect(state.active!.currentLeg.startScore).toBe(301);
    expect(state.active!.playerIndex).toBe(1);
  });

  it("treats the exact current score with isBust true as a bust (score unchanged)", () => {
    // Behavior snapshot: without the explicit bust flag, 501 would finish the
    // leg (remaining 0); the explicit flag overrides the checkout.
    const state = matchReducer(
      startPlaying(),
      submitTurn({ score: 501, isBust: true })
    );
    const turn = state.active!.currentLeg.turns[0];

    expect(turn.isBust).toBe(true);
    expect(turn.points).toBe(0);
    expect(turn.dartsUsed).toBe(0); // dartsUsed omitted → 0 on a bust too
    expect(turn.remainingScore).toBe(501); // stays current
    expect(state.players[0].score).toBe(501); // unchanged
    expect(state.status).toBe("playing");
    expect(state.active!.playerIndex).toBe(1);
  });

  it("ends the match on an exact 301 finish with firstToLegs 1", () => {
    const state = matchReducer(
      startPlaying({ startingScore: 301, firstToLegs: 1 }),
      submitTurn({ score: 301, dartsUsed: 3 })
    );

    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p1");
    expect(state.players[0].score).toBe(0);
  });

  it("finishes a sets-enabled 301 match via sets", () => {
    const state = matchReducer(
      startPlaying({
        startingScore: 301,
        setsEnabled: true,
        firstToLegs: 1,
        firstToSets: 1,
      }),
      submitTurn({ score: 301, dartsUsed: 3 })
    );

    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p1");
    expect(state.players[0].setsWon).toBe(1);
    expect(state.history.completedSets).toHaveLength(1);
  });

  it("records the passed dartsUsed on an exact 301 finish", () => {
    const state = matchReducer(
      startPlaying({ startingScore: 301 }),
      submitTurn({ score: 301, dartsUsed: 2 })
    );
    const turn = state.active!.currentLeg.turns[0];

    expect(state.status).toBe("leg_finished");
    expect(turn.points).toBe(301);
    expect(turn.remainingScore).toBe(0);
    expect(turn.dartsUsed).toBe(2);
    expect(state.players[0].totalDartsThrown).toBe(2);
  });
});