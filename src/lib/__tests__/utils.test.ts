import { describe, it, expect, vi, afterEach } from "vitest";
import {
  cn,
  checkFinishablePoint,
  PLAYER_COLORS,
  getRandomPlayerColor,
} from "../utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("lets tailwind-merge resolve conflicting classes", () => {
    expect(cn("px-4", "px-8")).toBe("px-8");
  });

  it("handles conditional and falsy inputs", () => {
    expect(cn("px-4", false && "hidden", true && "flex", null, undefined, "")).toBe(
      "px-4 flex"
    );
  });
});

describe("checkFinishablePoint", () => {
  it("returns true for finishable scores within 2..170", () => {
    expect(checkFinishablePoint(2)).toBe(true);
    expect(checkFinishablePoint(40)).toBe(true);
    expect(checkFinishablePoint(170)).toBe(true);
  });

  it("returns false for scores above 170", () => {
    expect(checkFinishablePoint(171)).toBe(false);
    expect(checkFinishablePoint(501)).toBe(false);
  });

  it("returns false for scores below 2", () => {
    expect(checkFinishablePoint(1)).toBe(false);
    expect(checkFinishablePoint(0)).toBe(false);
    expect(checkFinishablePoint(-10)).toBe(false);
  });

  it("returns false for bogie numbers", () => {
    for (const bogie of [169, 168, 166, 165, 163, 162, 159]) {
      expect(checkFinishablePoint(bogie)).toBe(false);
    }
  });

  it("is mode-aware: straight-out allows score 1, double-out does not", () => {
    expect(checkFinishablePoint(1, "straight")).toBe(true);
    expect(checkFinishablePoint(1, "double")).toBe(false);
    // Default parameter behaves as double-out
    expect(checkFinishablePoint(1)).toBe(false);
  });

  it("applies bogie numbers in both checkout modes", () => {
    expect(checkFinishablePoint(169, "straight")).toBe(false);
    expect(checkFinishablePoint(169, "double")).toBe(false);
  });

  it("still accepts finishable scores in double-out mode", () => {
    expect(checkFinishablePoint(170, "double")).toBe(true);
    expect(checkFinishablePoint(2, "double")).toBe(true);
  });

  it("straight-out: double-out bogeys that are reachable in 3 darts", () => {
    for (const score of [168, 165, 162, 159]) {
      expect(checkFinishablePoint(score, "straight")).toBe(true);
    }
  });

  it("straight-out: rejects the true straight-out bogey numbers", () => {
    for (const bogie of [163, 166, 169, 172, 173, 175, 176, 178, 179]) {
      expect(checkFinishablePoint(bogie, "straight")).toBe(false);
    }
  });

  it("straight-out: allows scores above the 170 double-out max", () => {
    expect(checkFinishablePoint(171, "straight")).toBe(true);
    expect(checkFinishablePoint(174, "straight")).toBe(true);
    expect(checkFinishablePoint(177, "straight")).toBe(true);
    expect(checkFinishablePoint(180, "straight")).toBe(true);
    expect(checkFinishablePoint(181, "straight")).toBe(false);
  });

  it("double-out: rejects the double-out bogeys above 170 reachable straight-out", () => {
    expect(checkFinishablePoint(171, "double")).toBe(false);
    expect(checkFinishablePoint(168, "double")).toBe(false);
  });
});

describe("PLAYER_COLORS", () => {
  it("exposes a fixed palette of 10 hex colors", () => {
    expect(PLAYER_COLORS).toHaveLength(10);
    for (const color of PLAYER_COLORS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("getRandomPlayerColor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a color from PLAYER_COLORS", () => {
    const color = getRandomPlayerColor();
    expect(PLAYER_COLORS).toContain(color);
  });

  it("excludes the given colors", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const color = getRandomPlayerColor([PLAYER_COLORS[0]]);
    expect(color).toBe(PLAYER_COLORS[1]);
  });

  it("falls back to the full palette when all colors are excluded", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const color = getRandomPlayerColor([...PLAYER_COLORS]);
    expect(color).toBe(PLAYER_COLORS[0]);
  });
});