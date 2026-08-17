/**
 * T3 — Dart rules compliance suite.
 *
 * Verifies the rules of darts as implemented by:
 *   - checkFinishablePoint (src/lib/utils.ts) — finishability/bogie rules
 *   - matchReducer.submitTurn / startNextLeg (src/lib/redux/matchSlice.ts)
 *     — bust rules, checkout handling, leg/set/match rotation, darts bookkeeping
 *
 * Bogie math citations below are validated against the complete dart score set:
 * singles 1..20, doubles 2..40 (even), triples 3..60 (multiples of 3), bull 25/50,
 * plus miss (0). Reachability was verified by exhaustive enumeration of all 3-dart
 * combinations (double-out: last dart must be a double or bull).
 */
import { describe, it, expect } from "vitest";
import { checkFinishablePoint } from "../utils";
import matchReducer, {
  startMatch,
  submitTurn,
  startNextLeg,
} from "../redux/matchSlice";
import type { MatchSettings, MatchState, PlayerInit } from "../../types/darts";

// --- Harness mirroring src/lib/redux/__tests__/matchSlice.test.ts -------------

const baseSettings: MatchSettings = {
  startingScore: 501,
  firstToLegs: 3,
  firstToSets: 1,
  setsEnabled: false,
  checkout: "double",
  randomOrder: false, // deterministic order everywhere
};

const defaultPlayers: PlayerInit[] = [
  { id: "p1", name: "Alice", color: "#22d3ee" },
  { id: "p2", name: "Bob", color: "#818cf8" },
];

const threePlayers: PlayerInit[] = [
  { id: "p1", name: "Alice", color: "#22d3ee" },
  { id: "p2", name: "Bob", color: "#818cf8" },
  { id: "p3", name: "Carol", color: "#f472b6" },
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
): MatchState =>
  matchReducer(initState(), startMatch(startPayload(overrides, players)));

// --- Group A: Bogie reachability table (checkFinishablePoint) -----------------

describe("Group A: bogie reachability table — checkFinishablePoint", () => {
  it.each<[number, string]>([
    [
      169,
      "169 = 60+60+49 — no single dart scores 49 (48 = T16, 50 = bull); " +
        "T20+T20+D20 = 160 is the max double-out finish below 170",
    ],
    [
      168,
      "168 = 60+60+48 = T20+T20+T16, but T16 is not a double; the last dart " +
        "must be a double/bull, and no double-ended partition exists (verified)",
    ],
    [
      166,
      "166 = 60+60+46 — no single dart scores 46 (45 = T15, 48 = T16)",
    ],
    [
      165,
      "165 = 60+60+45 = T20+T20+T15, but T15 is not a double",
    ],
    [
      163,
      "163 = 60+60+43 — no single dart scores 43 (42 = T14, 45 = T15)",
    ],
    [
      162,
      "162 = 60+60+42 = T20+T20+T14, but T14 is not a double",
    ],
    [
      159,
      "159 = 60+60+39 = T20+T20+T13, but T13 is not a double",
    ],
  ])("double mode: %i is a bogie (%s)", (score: number, reason: string) => {
    expect(checkFinishablePoint(score, "double"), reason).toBe(false);
  });

  it.each<[number, string]>([
    [168, "T20+T20+T16 = 60+60+48"],
    [165, "T20+T20+T15 = 60+60+45"],
    [162, "T20+T20+T14 = 60+60+42"],
    [159, "T20+T20+T13 = 60+60+39"],
  ])(
    "straight mode: %i is finishable — %s",
    (score: number, math: string) => {
      expect(checkFinishablePoint(score, "straight"), `3-dart solution: ${math}`).toBe(true);
    }
  );

  it.each<[number, string]>([
    [
      169,
      "169 = 60+60+49 — no single dart scores 49 (48 = T16, 50 = bull)",
    ],
    [
      166,
      "166 = 60+60+46 — no single dart scores 46 (45 = T15, 48 = T16)",
    ],
    [
      163,
      "163 = 60+60+43 — no single dart scores 43 (42 = T14, 45 = T15)",
    ],
  ])(
    "straight mode: %i is still a bogie (%s)",
    (score: number) => {
      expect(checkFinishablePoint(score, "straight")).toBe(false);
    }
  );

  it.each<[number, string]>([
    [
      172,
      "172 = 60+60+52 — no single dart scores 52 (51 = T17, 54 = T18); " +
        "no other 3-dart partition exists (verified)",
    ],
    [
      173,
      "173 = 60+60+53 — no single dart scores 53 (54 = T18)",
    ],
    [
      175,
      "175 = 60+60+55 — no single dart scores 55 (54 = T18, 57 = T19)",
    ],
    [
      176,
      "176 = 60+60+56 — no single dart scores 56 (54 = T18, 57 = T19)",
    ],
    [
      178,
      "178 = 60+60+58 — no single dart scores 58 (57 = T19, 60 = T20)",
    ],
    [
      179,
      "179 = 60+60+59 — no single dart scores 59 (57 = T19, 60 = T20)",
    ],
  ])(
    "straight mode: %i above 170 is a bogie (%s)",
    (score: number) => {
      expect(checkFinishablePoint(score, "straight")).toBe(false);
    }
  );

  it.each<[number, string]>([
    [171, "T20+T19+T18 = 60+57+54"],
    [174, "T20+T20+T18 = 60+60+54"],
    [177, "T20+T20+T19 = 60+60+57"],
    [180, "T20+T20+T20 = 60+60+60"],
  ])(
    "straight mode: %i above 170 is finishable — %s",
    (score: number) => {
      expect(checkFinishablePoint(score, "straight")).toBe(true);
    }
  );

  it("straight mode: 181 exceeds the 3-dart maximum (3×T20 = 180)", () => {
    expect(checkFinishablePoint(181, "straight")).toBe(false);
  });

  it("mode edge: 1 is finishable straight-out, bogus double-out (min 2)", () => {
    expect(checkFinishablePoint(1, "straight")).toBe(true);
    expect(checkFinishablePoint(1, "double")).toBe(false);
  });

  it("mode edge: 2 is finishable double-out (D1)", () => {
    expect(checkFinishablePoint(2, "double")).toBe(true);
    expect(checkFinishablePoint(2, "straight")).toBe(true);
  });

  it("mode edge: 170 = T20+T20+bull is finishable in both modes", () => {
    expect(checkFinishablePoint(170, "double")).toBe(true);
    expect(checkFinishablePoint(170, "straight")).toBe(true);
  });

  it("mode edge: 171 is above the double-out max, finishable straight-out", () => {
    expect(checkFinishablePoint(171, "double")).toBe(false);
    expect(checkFinishablePoint(171, "straight")).toBe(true);
  });

  it("mode edge: 180 = 3×T20 is finishable straight-out only", () => {
    expect(checkFinishablePoint(180, "double")).toBe(false);
    expect(checkFinishablePoint(180, "straight")).toBe(true);
  });

  it("non-bogie control: 167 = T19+T20+bull = 57+60+50 works in both modes", () => {
    expect(checkFinishablePoint(167, "double")).toBe(true);
    expect(checkFinishablePoint(167, "straight")).toBe(true);
  });
});

// --- Group B: Bust rules matrix (submitTurn) ----------------------------------

describe("Group B: bust rules matrix — submitTurn", () => {
  it("overshoot (remaining < 0) busts: score unchanged, +dartsUsed darts, 0 points, turn passes", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 600, dartsUsed: 2 }));

    const turn = state.active!.currentLeg.turns[0];
    expect(turn.isBust).toBe(true);
    expect(turn.points).toBe(0);
    expect(turn.dartsUsed).toBe(2); // actual darts thrown on the bust
    expect(turn.remainingScore).toBe(501); // pre-throw score preserved
    expect(state.players[0].score).toBe(501); // unchanged
    expect(state.players[0].totalDartsThrown).toBe(2);
    expect(state.players[0].totalPointsScored).toBe(0);
    expect(state.active!.playerIndex).toBe(1); // turn passes
    expect(state.status).toBe("playing");
  });

  it("remaining === 1 with double-out auto-busts (score unchanged, turn passes)", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 500, dartsUsed: 3 }));

    const turn = state.active!.currentLeg.turns[0];
    expect(turn.isBust).toBe(true);
    expect(state.players[0].score).toBe(501);
    expect(state.players[0].totalPointsScored).toBe(0);
    expect(state.active!.playerIndex).toBe(1);
  });

  it("remaining === 1 with straight-out is NOT a bust (score becomes 1, turn passes)", () => {
    let state = startPlaying({ checkout: "straight" });
    state = matchReducer(state, submitTurn({ score: 500, dartsUsed: 2 }));

    const turn = state.active!.currentLeg.turns[0];
    expect(turn.isBust).toBe(false);
    expect(state.players[0].score).toBe(1);
    expect(state.players[0].totalPointsScored).toBe(500);
    expect(state.players[0].totalDartsThrown).toBe(2);
    expect(state.active!.playerIndex).toBe(1);
  });

  it("explicit isBust: true busts even with a valid score", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3, isBust: true }));

    const turn = state.active!.currentLeg.turns[0];
    expect(turn.isBust).toBe(true);
    expect(turn.points).toBe(0);
    expect(turn.remainingScore).toBe(501);
    expect(state.players[0].score).toBe(501); // unchanged
    expect(state.players[0].totalPointsScored).toBe(0);
    expect(state.active!.playerIndex).toBe(1);
  });

  it("score 0 (all darts missed) is not a bust: 0 points, +dartsUsed, turn passes", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 0, dartsUsed: 3 }));

    const turn = state.active!.currentLeg.turns[0];
    expect(turn.isBust).toBe(false);
    expect(turn.points).toBe(0);
    expect(turn.remainingScore).toBe(501);
    expect(state.players[0].score).toBe(501);
    expect(state.players[0].totalDartsThrown).toBe(3);
    expect(state.players[0].totalPointsScored).toBe(0);
    expect(state.active!.playerIndex).toBe(1);
  });

  it("bust turns are recorded with isBust:true, points:0, dartsUsed: actual, remainingScore = pre-throw score", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 100, dartsUsed: 1, isBust: true }));

    expect(state.active!.currentLeg.turns[0]).toMatchObject({
      playerId: "p1",
      isBust: true,
      points: 0,
      dartsUsed: 1, // actual darts thrown on the bust
      remainingScore: 501, // pre-throw score, not 501 - 100
    });
  });
});

// --- Group C: Checkout rules --------------------------------------------------

describe("Group C: checkout rules", () => {
  it("170 double-out exact finish (60+60+bull) wins the leg", () => {
    // 170 = T20+T20+bull = 60+60+50 — the classic "Big Fish" checkout.
    // The reducer receives the turn total (170) and reaches 0; the per-dart
    // arithmetic is UI-level (checkFinishablePoint enforces finishability).
    let state = startPlaying({ startingScore: 170 });
    state = matchReducer(state, submitTurn({ score: 170, dartsUsed: 3 }));

    expect(state.status).toBe("leg_finished");
    expect(state.lastLegWinnerId).toBe("p1");
    expect(state.active!.currentLeg.winnerId).toBe("p1");
    expect(state.players[0].legsWon).toBe(1);
    expect(state.players[0].score).toBe(0);
    // Player index stays on the winner after a leg win
    expect(state.active!.playerIndex).toBe(0);
  });

  it("straight-out: throwing 1 from remaining 1 is an exact finish and wins the leg", () => {
    let state = startPlaying({ checkout: "straight" });
    // Alice leaves 1 (not a bust in straight mode)
    state = matchReducer(state, submitTurn({ score: 500, dartsUsed: 3 }));
    expect(state.players[0].score).toBe(1);
    // Bob's no-score turn
    state = matchReducer(state, submitTurn({ score: 0, dartsUsed: 3 }));
    // Back to Alice: exact 1 checkout
    state = matchReducer(state, submitTurn({ score: 1, dartsUsed: 1 }));

    expect(state.status).toBe("leg_finished");
    expect(state.lastLegWinnerId).toBe("p1");
    expect(state.active!.currentLeg.winnerId).toBe("p1");
    expect(state.players[0].legsWon).toBe(1);
    expect(state.active!.currentLeg.turns.at(-1)).toMatchObject({
      playerId: "p1",
      points: 1,
      isBust: false,
      dartsUsed: 1,
      remainingScore: 0,
    });
  });

  it("double-out: leaving 1 then throwing 1 auto-busts instead of winning", () => {
    let state = startPlaying();
    // Alice: 501 → 2 (normal hit), turn passes to Bob
    state = matchReducer(state, submitTurn({ score: 499, dartsUsed: 2 }));
    // Bob: no-score turn, turn passes back to Alice
    state = matchReducer(state, submitTurn({ score: 0, dartsUsed: 3 }));
    // Alice: 2 → 1 → auto-bust (remaining === 1 && double-out)
    state = matchReducer(state, submitTurn({ score: 1, dartsUsed: 1 }));

    expect(state.active!.currentLeg.turns[2]).toMatchObject({
      isBust: true,
      points: 0,
      dartsUsed: 1, // actual darts thrown on the bust
      remainingScore: 2,
    });
    expect(state.players[0].score).toBe(2); // unchanged by the bust
    expect(state.status).toBe("playing");
    expect(state.players[0].legsWon).toBe(0);
    expect(state.active!.playerIndex).toBe(1);
  });

  it("reducer does NOT enforce double-out finishability (UI blocks; reducer trusts input)", () => {
    // 169 is a double-out bogie — checkFinishablePoint(169, "double") is false
    // (169 = 60+60+49, and no single dart scores 49), so the UI would block
    // this throw. The reducer deliberately performs no finishability check;
    // this test snapshots that intended division of responsibility.
    expect(checkFinishablePoint(169, "double")).toBe(false);

    let state = startPlaying({ startingScore: 169 });
    state = matchReducer(state, submitTurn({ score: 169, dartsUsed: 3 }));

    expect(state.status).toBe("leg_finished");
    expect(state.lastLegWinnerId).toBe("p1");
    expect(state.players[0].score).toBe(0);
    expect(state.players[0].legsWon).toBe(1);
  });
});

// --- Group D: Leg/set/match structure + rotation compliance -------------------

describe("Group D: leg/set/match structure and rotation compliance", () => {
  it("2p: leg start alternates — leg1 P0, leg2 P1, leg3 P0 ((setStart + legsInSet) % N)", () => {
    let state = startPlaying({ firstToLegs: 3 });
    // Leg 1: Alice starts
    expect(state.active!.playerIndex).toBe(0);
    expect(state.active!.currentLeg.startPlayerIndex).toBe(0);

    // Leg 1 won by Alice → leg 2 starts with Bob: (0 + 1) % 2 = 1
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.status).toBe("leg_finished");
    state = matchReducer(state, startNextLeg());
    expect(state.active!.playerIndex).toBe(1);
    expect(state.active!.currentLeg.startPlayerIndex).toBe(1);

    // Leg 2 won by Bob → leg 3 starts with Alice: (0 + 2) % 2 = 0
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    state = matchReducer(state, startNextLeg());
    expect(state.active!.playerIndex).toBe(0);
    expect(state.active!.currentLeg.startPlayerIndex).toBe(0);
  });

  it("2p sets (firstToLegs 3, firstToSets 2): set 1 starts P0, set 2 starts P1 (completedSetsCount % N)", () => {
    let state = startPlaying({ setsEnabled: true, firstToLegs: 3, firstToSets: 2 });

    // Leg 1 (Alice starts, wins), Leg 2 (Bob starts, wins), Leg 3 (Alice wins),
    // Leg 4 (Bob wins), Leg 5 (Alice wins → 3 legs → set 1 complete)
    for (let i = 0; i < 4; i++) {
      state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
      state = matchReducer(state, startNextLeg());
    }
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));

    expect(state.players[0].legsWon).toBe(3);
    expect(state.players[0].setsWon).toBe(1);
    expect(state.history.completedSets).toHaveLength(1);
    expect(state.status).toBe("leg_finished"); // not match_finished: 1 < firstToSets 2

    // New set: completedSetsCount 1 % 2 = 1 → Bob starts set 2
    state = matchReducer(state, startNextLeg());
    expect(state.players.every((p) => p.legsWon === 0)).toBe(true);
    expect(state.active!.playerIndex).toBe(1);
    expect(state.active!.currentLeg.startPlayerIndex).toBe(1);
  });

  it("3p sets: first leg of each set rotates P0, P1, P2, P0 — (completedSetsCount % N)", () => {
    let state = startPlaying(
      { setsEnabled: true, firstToLegs: 1, firstToSets: 3 },
      threePlayers
    );
    expect(state.active!.playerIndex).toBe(0); // set 1 → P0

    // Set 1: P0 wins its single leg → setsWon 1
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.players[0].setsWon).toBe(1);
    state = matchReducer(state, startNextLeg());
    expect(state.active!.playerIndex).toBe(1); // set 2 → 1 % 3 = P1

    // Set 2: P1 wins → setsWon 1
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.players[1].setsWon).toBe(1);
    state = matchReducer(state, startNextLeg());
    expect(state.active!.playerIndex).toBe(2); // set 3 → 2 % 3 = P2

    // Set 3: P2 wins → setsWon 1 (still < firstToSets 3 → match continues)
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    expect(state.players[2].setsWon).toBe(1);
    expect(state.status).toBe("leg_finished");
    state = matchReducer(state, startNextLeg());
    expect(state.active!.playerIndex).toBe(0); // set 4 → 3 % 3 = P0
  });

  it("match finishes only when the target is reached; otherwise leg_finished", () => {
    let state = startPlaying({ firstToLegs: 3 });

    // Legs alternate P0, P1, P0, P1, P0 — winner is always the leg starter here.
    for (let i = 1; i <= 4; i++) {
      state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
      expect(state.status).toBe("leg_finished");
      expect(state.winnerId).toBeNull(); // target not reached
      state = matchReducer(state, startNextLeg());
    }
    // Leg 5: Alice wins her 3rd leg → match_finished
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));

    expect(state.status).toBe("match_finished");
    expect(state.winnerId).toBe("p1");
    expect(state.players[0].legsWon).toBe(3);
    // Player index stays on the winner
    expect(state.active!.playerIndex).toBe(0);
  });

  it("leg_finished → startNextLeg → playing with scores reset", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 501, dartsUsed: 3 }));
    const finishedLegId = state.active!.currentLeg.id;
    expect(state.status).toBe("leg_finished");

    state = matchReducer(state, startNextLeg());

    expect(state.status).toBe("playing");
    expect(state.players.every((p) => p.score === 501)).toBe(true);
    expect(state.active!.currentLeg.id).not.toBe(finishedLegId);
    expect(state.active!.currentLeg.startScore).toBe(501);
    expect(state.active!.currentLeg.turns).toEqual([]);
    expect(state.lastLegWinnerId).toBeNull();
  });
});

// --- Group E: PPR/darts bookkeeping -------------------------------------------

describe("Group E: PPR/darts bookkeeping", () => {
  it("normal turn: totalDartsThrown += dartsUsed, totalPointsScored += points", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 100, dartsUsed: 3 }));

    expect(state.players[0].totalDartsThrown).toBe(3);
    expect(state.players[0].totalPointsScored).toBe(100);
  });

  it("bust turn: totalDartsThrown += actual dartsUsed; totalPointsScored += 0", () => {
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 600, dartsUsed: 1 }));

    expect(state.players[0].totalDartsThrown).toBe(1);
    expect(state.players[0].totalPointsScored).toBe(0);
    expect(state.players[0].score).toBe(501);
  });

  it("dartsUsed omitted defaults to 0 (documented behavior snapshot)", () => {
    // Behavior snapshot: submitTurn defaults dartsUsed to 0; the UI always
    // passes an explicit value. Do not assume a default of 3.
    let state = startPlaying();
    state = matchReducer(state, submitTurn({ score: 60 }));

    expect(state.players[0].totalDartsThrown).toBe(0);
    expect(state.players[0].totalPointsScored).toBe(60);
  });

  it("leg-winning turn is recorded in the leg's turns with remainingScore 0", () => {
    let state = startPlaying({ startingScore: 301 });
    state = matchReducer(state, submitTurn({ score: 301, dartsUsed: 3 }));

    expect(state.active!.currentLeg.turns).toHaveLength(1);
    expect(state.active!.currentLeg.turns[0]).toMatchObject({
      playerId: "p1",
      points: 301,
      isBust: false,
      dartsUsed: 3,
      remainingScore: 0,
    });
    expect(state.players[0].totalPointsScored).toBe(301);
    expect(state.players[0].totalDartsThrown).toBe(3);
  });

  it("PPR derivation across normal + bust turns matches src/lib/stats.ts", () => {
    // stats.ts: ppr = totalPointsScored / (totalDartsThrown / 3)
    let state = startPlaying();
    // Alice: 60 points, 3 darts
    state = matchReducer(state, submitTurn({ score: 60, dartsUsed: 3 }));
    // Bob: no-score turn
    state = matchReducer(state, submitTurn({ score: 0, dartsUsed: 3 }));
    // Alice: bust — 1 dart counted (actual dartsUsed), 0 points
    state = matchReducer(state, submitTurn({ score: 600, dartsUsed: 1 }));
    // Bob: no-score turn
    state = matchReducer(state, submitTurn({ score: 0, dartsUsed: 3 }));
    // Alice: 100 points, 2 darts
    state = matchReducer(state, submitTurn({ score: 100, dartsUsed: 2 }));

    const alice = state.players[0];
    expect(alice.totalDartsThrown).toBe(6); // 3 + 1 (bust) + 2
    expect(alice.totalPointsScored).toBe(160); // 60 + 0 + 100
    const ppr = alice.totalPointsScored / (alice.totalDartsThrown / 3);
    expect(ppr).toBe(80);
  });
});
