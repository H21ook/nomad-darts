// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DartBoardPad from '@/components/scoring/DartBoardPad';

// vitest globals are disabled (see vitest.config.ts), so RTL's auto-cleanup
// never registers — without this, renders accumulate in document.body and
// queries hit "multiple elements" across tests. Same pattern as matchFlow.test.tsx.
afterEach(() => {
  cleanup();
});

const RECT = { x: 0, y: 0, width: 200, height: 200, top: 0, left: 0, right: 200, bottom: 200, toJSON: () => {} };

function renderPad(overrides: { currentScore?: number; checkout?: 'double' | 'straight' } = {}) {
  const onSubmit = vi.fn();
  render(
    <DartBoardPad
      onSubmit={onSubmit}
      currentScore={overrides.currentScore ?? 301}
      checkout={overrides.checkout ?? 'double'}
    />
  );
  return { onSubmit };
}

/** Fire a pointerdown at board-local (x, y) with (0,0) = top-left of the 200x200 svg. */
function tap(x: number, y: number) {
  // TurnDisplay's undo button renders a Tabler icon <svg> earlier in the DOM —
  // select the board by role="img" so we never hit the icon.
  const svg = document.querySelector('svg[role="img"]')!;
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(RECT as DOMRect);
  fireEvent.pointerDown(svg, { clientX: x, clientY: y });
}

describe('DartBoardPad', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('records a single 20 when tapping 12 o\'clock in the segment area', () => {
    const { onSubmit } = renderPad();
    tap(100, 60); // r = 0.4 → segment area; angle 0° → 20
    tap(100, 60);
    tap(100, 60);
    expect(onSubmit).toHaveBeenCalledWith(60, 3, false);
  });

  it('records T20 when Triple is selected (multiplier from buttons, not ring position)', () => {
    const { onSubmit } = renderPad({ currentScore: 61 });
    const triple = screen.getByRole('button', { name: /Triple/ });
    fireEvent.pointerDown(triple, {});
    tap(100, 60); // tapping the SINGLE area with Triple active → T20 = 60
    tap(100, 60); // same again → 60+60 > 61 → bust on the 2nd dart
    expect(onSubmit).toHaveBeenCalledWith(0, 2, true);
  });

  it('bull: inner = 50, outer = 25, Double + outer = 50', () => {
    const { onSubmit } = renderPad({ currentScore: 201 });
    tap(100, 100);      // center → inner bull 50
    expect(screen.getByText('50')).toBeInTheDocument();
    tap(100, 108.2);    // r = 0.082 → outer bull 25
    expect(screen.getByText('75')).toBeInTheDocument();
    const dbl = screen.getByRole('button', { name: /Double/ });
    fireEvent.pointerDown(dbl, {});
    tap(100, 108.2);    // Double + outer bull → 50; 3rd dart auto-submits
    expect(onSubmit).toHaveBeenCalledWith(125, 3, false); // 50 + 25 + 50
  });

  it('undo removes the last dart', () => {
    renderPad();
    tap(100, 60); // S20
    fireEvent.pointerDown(screen.getByRole('button', { name: /Undo dart/ }), {});
    tap(100, 60); // S20
    tap(100, 60); // S20
    expect(screen.getByText('40')).toBeInTheDocument(); // 20 + 20, one undone
  });

  it('finishes double-out with D20 on 40', () => {
    const { onSubmit } = renderPad({ currentScore: 40 });
    fireEvent.pointerDown(screen.getByRole('button', { name: /Double/ }), {});
    tap(100, 60); // D20 = 40 === remaining → finish
    expect(onSubmit).toHaveBeenCalledWith(40, 1, false);
  });
});
