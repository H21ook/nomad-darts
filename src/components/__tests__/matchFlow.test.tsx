// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import matchReducer, { startMatch, submitTurn } from "@/lib/redux/matchSlice";
import matchHistoryReducer from "@/lib/redux/matchHistorySlice";
import { MatchSetup } from "@/components/match/MatchSetup";
import MatchPage from "@/app/match/page";
import MatchFinishedPage from "@/app/match/finished/page";
import type { MatchSettings, PlayerInit } from "@/types/darts";
import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactElement, ReactNode } from "react";
import "@testing-library/jest-dom/vitest";

// ---------------------------------------------------------------------------
// Mocks — vi.mock is hoisted above imports, so shared mock values live in
// vi.hoisted. framer-motion is replaced with pass-through components (children
// only), next/link with a plain <a>, next/image with <img>, canvas-confetti
// with a no-op, and next/navigation with a router spy + throwing redirect.
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
const { routerMock, redirectMock, motionProxy } = vi.hoisted(() => {
  // Tag-aware framer-motion passthrough: motion.button must stay a real
  // <button> (NumberPad digits use FastButton, which relies on the button
  // element + onPointerDown), everything else renders children in a <div>.
  // Motion-only props (animation, drag, variants) are dropped.
  // IMPORTANT: each tag gets ONE stable component instance — a fresh function
  // per access would make React see a new component type on every render and
  // remount subtrees (detaching them from the DOM, breaking clicks).
  const motionTags = new Map<string, (props: any) => any>();
  // Motion-only props (animation, drag, variants) are dropped from the DOM.
  const MOTION_ONLY_PROPS = [
    "initial",
    "animate",
    "exit",
    "transition",
    "variants",
    "custom",
    "whileTap",
    "whileHover",
    "whileInView",
    "drag",
    "dragConstraints",
    "dragElastic",
    "dragMomentum",
    "layout",
    "layoutId",
  ];
  const motionTag = (tag: string) => {
    const component = (props: any) => {
      const { children, ...rest } = props;
      for (const key of MOTION_ONLY_PROPS) delete rest[key];
      return tag === "button" ? (
        <button {...rest} type="button">
          {children}
        </button>
      ) : (
        <div {...rest}>{children}</div>
      );
    };
    component.displayName = `motion.${tag}`;
    return component;
  };
  return {
    routerMock: { push: vi.fn(), replace: vi.fn(), back: vi.fn() },
    redirectMock: vi.fn(() => {
      throw new Error("redirect");
    }),
    motionProxy: new Proxy(
      {},
      {
        get: (_target, prop) => {
          const tag = String(prop);
          let component = motionTags.get(tag);
          if (!component) {
            component = motionTag(tag);
            motionTags.set(tag, component);
          }
          return component;
        },
      }
    ),
  };
});
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  redirect: redirectMock,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock("framer-motion", () => ({
  motion: motionProxy,
  AnimatePresence: ({ children }: { children?: ReactNode } & Record<string, unknown>) => children,
  Reorder: {
    Group: ({ children }: { children?: ReactNode } & Record<string, unknown>) => (
      <div>{children}</div>
    ),
    Item: ({ children }: { children?: ReactNode } & Record<string, unknown>) => (
      <div>{children}</div>
    ),
  },
  useDragControls: () => ({ start: vi.fn() }),
}));

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

// ---------------------------------------------------------------------------
// Test harness — plain redux store (match + matchHistory, no persist)
// ---------------------------------------------------------------------------

const makeStore = () =>
  configureStore({
    reducer: combineReducers({
      match: matchReducer,
      matchHistory: matchHistoryReducer,
    }),
  });

type TestStore = ReturnType<typeof makeStore>;
type User = ReturnType<typeof userEvent.setup>;

const renderWithStore = (ui: ReactElement, store: TestStore) =>
  render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  });

afterEach(() => {
  cleanup();
  routerMock.push.mockClear();
  routerMock.replace.mockClear();
  routerMock.back.mockClear();
  redirectMock.mockClear();
});

// ---------------------------------------------------------------------------
// Scenario drivers — drive the app exactly like a human
// ---------------------------------------------------------------------------

interface WizardOptions {
  startingScore?: number;
  checkout?: "double" | "straight";
  format?: "legs" | "sets";
  firstToSets?: number;
  playerCount?: number;
  randomOrder?: boolean;
}

/** Click through the MatchSetup wizard and start the match. */
async function renderMatchSetupAndStart(store: TestStore, opts: WizardOptions = {}) {
  const user = userEvent.setup();
  renderWithStore(<MatchSetup />, store);

  // Step 1 — game mode + match rules
  if (opts.startingScore && opts.startingScore !== 501) {
    await user.click(screen.getByRole("button", { name: String(opts.startingScore) }));
  }
  if (opts.checkout === "straight") {
    await user.click(screen.getByRole("button", { name: "Straight Out" }));
  }
  if (opts.format === "sets") {
    await user.click(screen.getByRole("button", { name: "Sets" }));
    if (opts.firstToSets) {
      const setsRow = screen.getByText(/First to \d+ sets/).closest("div") as HTMLElement;
      for (let i = 1; i < opts.firstToSets; i++) {
        await user.click(within(setsRow).getByRole("button", { name: "+" }));
      }
    }
  }

  await user.click(screen.getByRole("button", { name: "REVIEW ORDER" }));

  // Step 2 — starting order + players
  if (opts.randomOrder === false) {
    await user.click(screen.getByRole("button", { name: "Off" }));
  }
  if (opts.playerCount === 3) {
    await user.click(screen.getByRole("button", { name: /Add Player/ }));
  }

  await user.click(screen.getByRole("button", { name: "START MATCH" }));
}

/** Render the live match page and locate the NumberPad container. */
function renderMatchPage(store: TestStore) {
  const view = renderWithStore(<MatchPage />, store);
  const pad = view.container.querySelector("div.p-2.gap-2.bg-black");
  if (!pad) throw new Error("NumberPad container not found");
  return { view, pad: pad as HTMLElement };
}

/** Current text shown in the NumberPad display. */
const displayText = (pad: HTMLElement) =>
  pad.querySelector("span.text-5xl")?.textContent ?? "";

/** Tap digits on the NumberPad and press the check (submit) button. */
async function submitScore(user: User, pad: HTMLElement, digits: string) {
  for (const digit of digits) {
    await user.click(within(pad).getByRole("button", { name: digit }));
  }
  const submit = pad.querySelector("button.bg-cyan-500");
  if (!submit) throw new Error("Submit button not found");
  await user.click(submit as HTMLElement);
}

/**
 * Finish the current player's leg through the checkout dialog: type the exact
 * score, confirm the double (double-out only), pick the dart count.
 */
async function finishLeg(user: User, store: TestStore, pad: HTMLElement, dartsUsed: number) {
  const match = store.getState().match;
  const score = match.players[match.active!.playerIndex].score;
  await submitScore(user, pad, String(score));

  const dialog = screen.getByText("CHECKOUT!").closest("div.bg-zinc-900");
  if (!dialog) throw new Error("Finish dialog not found");
  if (store.getState().match.settings.checkout === "double") {
    await user.click(within(dialog as HTMLElement).getByRole("button", { name: /Double/ }));
  }
  await user.click(within(dialog as HTMLElement).getByRole("button", { name: String(dartsUsed) }));
}

/**
 * Play one full leg through the UI. The intended winner throws 60s until the
 * score is at most 100, then sets up a 40 checkout and finishes; everyone else
 * throws 60s down to 61, then zeroes (keeps their score) — no accidental
 * busts or checkouts.
 */
async function playLeg(user: User, store: TestStore, pad: HTMLElement, winnerIndex: number, dartsUsed: number) {
  while (store.getState().match.status === "playing") {
    const match = store.getState().match;
    const activeIdx = match.active!.playerIndex;
    const score = match.players[activeIdx].score;
    if (activeIdx === winnerIndex) {
      if (score > 100) {
        await submitScore(user, pad, "60");
      } else if (score > 40) {
        await submitScore(user, pad, String(score - 40));
      } else {
        await finishLeg(user, store, pad, dartsUsed);
      }
    } else {
      await submitScore(user, pad, score > 61 ? "60" : "0");
    }
  }
}

/** Play the whole match, clicking START NEXT LEG between legs. */
async function playMatch(user: User, store: TestStore, pad: HTMLElement, winnerIndex: number, dartsUsed: number) {
  while (store.getState().match.status !== "match_finished") {
    await playLeg(user, store, pad, winnerIndex, dartsUsed);
    if (store.getState().match.status === "leg_finished") {
      await user.click(screen.getByText("START NEXT LEG"));
    }
  }
}

/** Seed a started match directly on the store (bypasses the wizard). */
const SEED_PLAYERS: PlayerInit[] = [
  { id: "p1", name: "Alice", color: "#22d3ee" },
  { id: "p2", name: "Bob", color: "#818cf8" },
];

function seedMatch(store: TestStore, overrides: Partial<MatchSettings> = {}) {
  store.dispatch(
    startMatch({
      startingScore: 501,
      firstToLegs: 3,
      firstToSets: 1,
      setsEnabled: false,
      checkout: "double",
      randomOrder: false,
      players: SEED_PLAYERS,
      ...overrides,
    })
  );
}

/** Bring player 1 down to targetScore and pass the turn back to them. */
function seedScore(store: TestStore, targetScore: number) {
  store.dispatch(submitTurn({ score: 501 - targetScore, dartsUsed: 3 }));
  store.dispatch(submitTurn({ score: 0, dartsUsed: 3 }));
}

const ppr = (p: { totalPointsScored: number; totalDartsThrown: number }) =>
  p.totalPointsScored / (p.totalDartsThrown / 3);

// ---------------------------------------------------------------------------
// Wizard
// ---------------------------------------------------------------------------

describe("MatchSetup wizard", () => {
  it("starts a 501 double-out legs match and navigates to /match", async () => {
    const store = makeStore();
    await renderMatchSetupAndStart(store, { randomOrder: false });

    expect(routerMock.push).toHaveBeenCalledWith("/match");
    const m = store.getState().match;
    expect(m.status).toBe("playing");
    expect(m.settings).toMatchObject({
      startingScore: 501,
      checkout: "double",
      firstToLegs: 3,
      firstToSets: 1,
      setsEnabled: false,
      randomOrder: false,
    });
    expect(m.players.map((p) => p.name)).toEqual(["Player 1", "Player 2"]);
    expect(m.players.map((p) => p.score)).toEqual([501, 501]);
    expect(m.active!.playerIndex).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// CORRECT variants — full matches driven through the real UI
// ---------------------------------------------------------------------------

describe("CORRECT: full matches", () => {
  // Full-match scenarios drive dozens of real clicks — they legitimately take
  // several seconds, so they get a dedicated, generous timeout.
  const FULL_MATCH_TIMEOUT = 60_000;

  it("501 double-out 2p: Player 1 wins 3 legs to 0 with a 1-dart finish", async () => {
    const store = makeStore();
    await renderMatchSetupAndStart(store, { randomOrder: false });
    cleanup();
    const { pad } = renderMatchPage(store);
    const user = userEvent.setup();

    await playMatch(user, store, pad, 0, 1);

    const m = store.getState().match;
    const [a, b] = m.players;
    expect(m.status).toBe("match_finished");
    expect(m.winnerId).toBe(a.id);
    expect(m.lastLegWinnerId).toBe(a.id);
    expect([a.legsWon, b.legsWon]).toEqual([3, 0]);
    expect([a.setsWon, b.setsWon]).toEqual([0, 0]);
    expect([a.score, b.score]).toEqual([0, 21]);
    expect([a.totalDartsThrown, b.totalDartsThrown]).toEqual([75, 75]);
    expect([a.totalPointsScored, b.totalPointsScored]).toEqual([1503, 1440]);
    expect(ppr(a)).toBeCloseTo(1503 / 25, 5);
    expect(ppr(b)).toBeCloseTo(1440 / 25, 5);

    const legs = m.active!.currentSet.legs;
    expect(legs.map((l) => l.winnerId)).toEqual([a.id, a.id, a.id]);
    expect(legs.map((l) => l.startPlayerIndex)).toEqual([0, 1, 0]);
    expect(legs.map((l) => l.turns.length)).toEqual([17, 18, 17]);

    expect(routerMock.replace).toHaveBeenCalledWith("/match/finished");
  }, FULL_MATCH_TIMEOUT);

  it("301 straight-out 2p: exact-score finish with 3 darts, Player 1 wins 3-0", async () => {
    const store = makeStore();
    await renderMatchSetupAndStart(store, { startingScore: 301, checkout: "straight", randomOrder: false });
    cleanup();
    const { pad } = renderMatchPage(store);
    const user = userEvent.setup();

    await playMatch(user, store, pad, 0, 3);

    const m = store.getState().match;
    const [a, b] = m.players;
    expect(m.status).toBe("match_finished");
    expect(m.winnerId).toBe(a.id);
    expect([a.legsWon, b.legsWon]).toEqual([3, 0]);
    expect([a.score, b.score]).toEqual([0, 61]);
    expect([a.totalDartsThrown, b.totalDartsThrown]).toEqual([54, 48]);
    expect([a.totalPointsScored, b.totalPointsScored]).toEqual([903, 720]);
    expect(ppr(a)).toBeCloseTo(903 / 18, 5);
    expect(ppr(b)).toBeCloseTo(45, 5);

    const legs = m.active!.currentSet.legs;
    expect(legs.map((l) => l.turns.length)).toEqual([11, 12, 11]);
  }, FULL_MATCH_TIMEOUT);

  it("101 legs 3p: 3 players, Player 1 wins 3-0 with rotating leg starters", async () => {
    const store = makeStore();
    await renderMatchSetupAndStart(store, { startingScore: 101, playerCount: 3, randomOrder: false });
    cleanup();
    const { pad } = renderMatchPage(store);
    const user = userEvent.setup();

    await playMatch(user, store, pad, 0, 2);

    const m = store.getState().match;
    const [a, b, c] = m.players;
    expect(m.players).toHaveLength(3);
    expect(m.status).toBe("match_finished");
    expect(m.winnerId).toBe(a.id);
    expect([a.legsWon, b.legsWon, c.legsWon]).toEqual([3, 0, 0]);
    expect([a.score, b.score, c.score]).toEqual([0, 41, 41]);
    expect([a.totalDartsThrown, b.totalDartsThrown, c.totalDartsThrown]).toEqual([24, 21, 24]);
    expect([a.totalPointsScored, b.totalPointsScored, c.totalPointsScored]).toEqual([303, 180, 180]);
    expect(ppr(a)).toBeCloseTo(909 / 24, 5);
    expect(ppr(b)).toBeCloseTo(540 / 21, 5);
    expect(ppr(c)).toBeCloseTo(540 / 24, 5);

    const legs = m.active!.currentSet.legs;
    expect(legs.map((l) => l.startPlayerIndex)).toEqual([0, 1, 2]);
    expect(legs.map((l) => l.turns.length)).toEqual([7, 9, 8]);
  }, FULL_MATCH_TIMEOUT);

  it("sets mode: firstToLegs 3 / firstToSets 2 — two sets, both to Player 1", async () => {
    const store = makeStore();
    await renderMatchSetupAndStart(store, { format: "sets", firstToSets: 2, randomOrder: false });
    cleanup();
    const { pad } = renderMatchPage(store);
    const user = userEvent.setup();

    await playMatch(user, store, pad, 0, 1);

    const m = store.getState().match;
    const [a, b] = m.players;
    expect(m.status).toBe("match_finished");
    expect(m.winnerId).toBe(a.id);
    expect([a.setsWon, b.setsWon]).toEqual([2, 0]);
    expect([a.legsWon, b.legsWon]).toEqual([3, 0]);
    expect([a.score, b.score]).toEqual([0, 21]);
    expect([a.totalDartsThrown, b.totalDartsThrown]).toEqual([150, 153]);
    expect([a.totalPointsScored, b.totalPointsScored]).toEqual([3006, 2880]);
    expect(ppr(a)).toBeCloseTo(3006 / 50, 5);
    expect(ppr(b)).toBeCloseTo(2880 / 51, 5);

    expect(m.history.completedSets).toHaveLength(2);
    expect(m.history.completedSets.map((s) => s.winnerId)).toEqual([a.id, a.id]);
    expect(m.history.completedSets[0].legs).toHaveLength(3);
    expect(m.history.completedSets[1].legs).toHaveLength(3);
    // Set 2 starts with the loser of set 1, then alternates within the set.
    expect(m.history.completedSets[1].legs.map((l) => l.startPlayerIndex)).toEqual([1, 0, 1]);
  }, FULL_MATCH_TIMEOUT);

  it.each([1, 2, 3])("finishes via the exact-score dialog using %d dart(s)", async (dartsUsed) => {
    const store = makeStore();
    seedMatch(store, { firstToLegs: 1 });
    seedScore(store, 40);
    const { pad } = renderMatchPage(store);
    const user = userEvent.setup();

    await submitScore(user, pad, "40");

    const dialog = screen.getByText("CHECKOUT!").closest("div.bg-zinc-900") as HTMLElement;
    await user.click(within(dialog).getByRole("button", { name: /Double/ }));
    await user.click(within(dialog).getByRole("button", { name: String(dartsUsed) }));

    const m = store.getState().match;
    const [a, b] = m.players;
    expect(m.status).toBe("match_finished");
    expect(m.winnerId).toBe(a.id);
    expect(a.legsWon).toBe(1);
    expect(a.score).toBe(0);
    expect(b.score).toBe(501);
    expect(a.totalDartsThrown).toBe(3 + dartsUsed);
    expect(a.totalPointsScored).toBe(501);
    expect(ppr(a)).toBeCloseTo((501 * 3) / (3 + dartsUsed), 5);
    expect(m.active!.currentSet.legs[0].turns).toHaveLength(3);
  });

  it("leg transition: START NEXT LEG resets scores and alternates the starter", async () => {
    const store = makeStore();
    seedMatch(store, { firstToLegs: 3 });
    const { pad } = renderMatchPage(store);
    const user = userEvent.setup();

    await playLeg(user, store, pad, 0, 1);

    let m = store.getState().match;
    expect(m.status).toBe("leg_finished");
    expect(m.lastLegWinnerId).toBe(m.players[0].id);
    expect(m.players[0].legsWon).toBe(1);

    await user.click(screen.getByText("START NEXT LEG"));
    m = store.getState().match;
    expect(m.status).toBe("playing");
    expect(m.active!.playerIndex).toBe(1);
    expect(m.players.map((p) => p.score)).toEqual([501, 501]);
    expect(m.active!.currentLeg.turns).toHaveLength(0);

    await playLeg(user, store, pad, 0, 1);
    await user.click(screen.getByText("START NEXT LEG"));
    m = store.getState().match;
    expect(m.status).toBe("playing");
    expect(m.active!.playerIndex).toBe(0);
  }, FULL_MATCH_TIMEOUT);

  it("match finished: MatchFinished renders, stats link present, PLAY REMATCH restarts", async () => {
    const store = makeStore();
    seedMatch(store, { firstToLegs: 1 });
    const { pad } = renderMatchPage(store);
    const user = userEvent.setup();

    await playLeg(user, store, pad, 0, 2);

    expect(store.getState().match.status).toBe("match_finished");
    expect(routerMock.replace).toHaveBeenCalledWith("/match/finished");

    cleanup();
    renderWithStore(<MatchFinishedPage />, store);

    expect(screen.getByRole("button", { name: "PLAY REMATCH" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Full Statistics/ })).toHaveAttribute("href", "/match/stats");
    expect(screen.getByRole("heading", { name: "Alice" })).toBeInTheDocument();
    expect(store.getState().matchHistory.matches).toHaveLength(1);
    expect(store.getState().matchHistory.matches[0].winnerId).toBe("p1");

    // Rematch flips status to playing; the finished page then redirects (our
    // mock throws) — the re-render error is expected and swallowed.
    await user.click(screen.getByRole("button", { name: "PLAY REMATCH" })).then(
      () => {},
      () => {}
    );

    expect(redirectMock).toHaveBeenCalledWith("/match");
    const m = store.getState().match;
    expect(m.status).toBe("playing");
    expect(m.players.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(m.players.map((p) => p.score)).toEqual([501, 501]);
    expect(m.players.map((p) => p.legsWon)).toEqual([0, 0]);
    expect(m.players.map((p) => p.setsWon)).toEqual([0, 0]);
    expect(m.players.map((p) => p.totalDartsThrown)).toEqual([0, 0]);
    expect(m.players.map((p) => p.totalPointsScored)).toEqual([0, 0]);
    // Previous winner + 1 starts the rematch.
    expect(m.active!.playerIndex).toBe(1);
  }, FULL_MATCH_TIMEOUT);
});

// ---------------------------------------------------------------------------
// INCORRECT variants — bad input must never corrupt the match
// ---------------------------------------------------------------------------

describe("INCORRECT: bad input is rejected", () => {
  it("typed exact bogie 169 in double-out is blocked: no dispatch, input kept", async () => {
    const store = makeStore();
    seedMatch(store);
    seedScore(store, 169);
    const { pad } = renderMatchPage(store);
    const user = userEvent.setup();

    await submitScore(user, pad, "169");

    const m = store.getState().match;
    expect(m.active!.currentLeg.turns).toHaveLength(2);
    expect(m.players[0].score).toBe(169);
    expect(m.active!.playerIndex).toBe(0);
    expect(m.status).toBe("playing");
    expect(displayText(pad)).toBe("169");
  });

  it("typing a score over 180 is rejected digit by digit", async () => {
    const store = makeStore();
    seedMatch(store);
    const { pad } = renderMatchPage(store);
    const user = userEvent.setup();

    // Type "199" — the third digit must be rejected (199 > 180), leaving "19".
    for (const digit of "199") {
      await user.click(within(pad).getByRole("button", { name: digit }));
    }

    expect(displayText(pad)).toBe("19");
    const m = store.getState().match;
    expect(m.active!.currentLeg.turns).toHaveLength(0);
    expect(m.players[0].score).toBe(501);
    expect(m.active!.playerIndex).toBe(0);
  });

  it("overshoot busts: score unchanged, turn passes, +3 darts, 0 points", async () => {
    const store = makeStore();
    seedMatch(store);
    seedScore(store, 40);
    const { pad } = renderMatchPage(store);
    const user = userEvent.setup();

    await submitScore(user, pad, "41");

    const m = store.getState().match;
    expect(m.players[0].score).toBe(40);
    expect(m.active!.playerIndex).toBe(1);
    // 3 darts from the seed throw (501→40) + 3 from the busted turn.
    expect(m.players[0].totalDartsThrown).toBe(6);
    expect(m.players[0].totalPointsScored).toBe(461);
    const lastTurn = m.active!.currentLeg.turns.at(-1)!;
    expect(lastTurn.isBust).toBe(true);
    expect(lastTurn.dartsUsed).toBe(3);
    expect(lastTurn.points).toBe(0);
  });

  it("leaving 1 in double-out auto-busts", async () => {
    const store = makeStore();
    seedMatch(store);
    seedScore(store, 41);
    const { pad } = renderMatchPage(store);
    const user = userEvent.setup();

    await submitScore(user, pad, "40");

    const m = store.getState().match;
    expect(m.players[0].score).toBe(41);
    expect(m.active!.playerIndex).toBe(1);
    // 3 darts from the seed throw (501→41) + 3 from the auto-busted turn.
    expect(m.players[0].totalDartsThrown).toBe(6);
    expect(m.players[0].totalPointsScored).toBe(460);
    expect(m.active!.currentLeg.turns.at(-1)!.isBust).toBe(true);
  });

  it('"Not double" in the checkout dialog dispatches a bust', async () => {
    const store = makeStore();
    seedMatch(store);
    seedScore(store, 40);
    const { pad } = renderMatchPage(store);
    const user = userEvent.setup();

    await submitScore(user, pad, "40");

    const dialog = screen.getByText("CHECKOUT!").closest("div.bg-zinc-900") as HTMLElement;
    await user.click(within(dialog).getByRole("button", { name: "Not double" }));

    const m = store.getState().match;
    expect(m.players[0].score).toBe(40);
    expect(m.active!.playerIndex).toBe(1);
    // 3 darts from the seed throw (501→40) + 3 from the busted turn.
    expect(m.players[0].totalDartsThrown).toBe(6);
    expect(m.players[0].totalPointsScored).toBe(461);
    expect(m.active!.currentLeg.turns.at(-1)!.isBust).toBe(true);
    expect(screen.queryByText("CHECKOUT!")).not.toBeInTheDocument();
  });

  it("undo after a bad turn restores state; the typed input stays stale until cleared", async () => {
    const store = makeStore();
    seedMatch(store);
    seedScore(store, 40);
    const { pad } = renderMatchPage(store);
    const user = userEvent.setup();

    // Bad turn: overshoot bust at 40 with 41.
    await submitScore(user, pad, "41");
    expect(store.getState().match.players[0].totalDartsThrown).toBe(6);

    // Type the next score (without submitting), then undo the bad turn.
    for (const digit of "60") {
      await user.click(within(pad).getByRole("button", { name: digit }));
    }
    expect(displayText(pad)).toBe("60");
    await user.click(within(pad).getByRole("button", { name: /Undo/ }));

    const m = store.getState().match;
    expect(m.players[0].score).toBe(40);
    // Undo restores the state after the seed (3 darts, 461 points).
    expect(m.players[0].totalDartsThrown).toBe(3);
    expect(m.players[0].totalPointsScored).toBe(461);
    expect(m.active!.playerIndex).toBe(0);
    expect(m.active!.currentLeg.turns).toHaveLength(2);
    expect(m.snapshots).toHaveLength(2);
    // Stale input survives the undo…
    expect(displayText(pad)).toBe("60");
    // …and is cleared with the backspace button.
    const clear = pad.querySelector("button.absolute.right-4");
    if (!clear) throw new Error("Clear button not found");
    await user.click(clear as HTMLElement);
    expect(displayText(pad)).toBe("0");
  });

  it("abandon via ExitConfirmation returns the match to setup", async () => {
    const store = makeStore();
    seedMatch(store);
    renderMatchPage(store);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByText("Exit game?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Exit" }));

    const m = store.getState().match;
    expect(m.status).toBe("setup");
    expect(m.active).toBeNull();
    expect(routerMock.replace).toHaveBeenCalledWith("/");
  });
});
