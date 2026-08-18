// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import DartSlotsDisplay from '@/components/scoring/DartSlotsDisplay';
import type { DartEntry } from '@/hooks/useDartTurn';

// vitest globals are disabled (see vitest.config.ts), so RTL's auto-cleanup
// never registers — without this, renders accumulate in document.body.
afterEach(() => {
  cleanup();
});

const slotsRow = () => document.querySelector('div.grid.grid-cols-3');
const sumLine = () => document.querySelector('span.text-zinc-600');

function renderDisplay(overrides: { darts?: DartEntry[]; total?: number; canUndo?: boolean; bustFlash?: boolean } = {}) {
  const onUndo = vi.fn();
  render(
    <DartSlotsDisplay
      darts={overrides.darts ?? []}
      total={overrides.total ?? 0}
      onUndo={onUndo}
      canUndo={overrides.canUndo ?? false}
      bustFlash={overrides.bustFlash}
    />
  );
  return { onUndo };
}

describe('DartSlotsDisplay', () => {
  it('renders three empty slots and a dim sum of 0', () => {
    renderDisplay();
    expect(slotsRow()!.querySelectorAll('div').length).toBe(3);
    expect(slotsRow()!.querySelectorAll('span').length).toBe(0); // no numbers
    expect(sumLine()!.textContent).toBe('0');
  });

  it('fills slots left to right with each dart points', () => {
    renderDisplay({
      darts: [
        { segment: 20, multiplier: 'S', points: 20 },
        { segment: 20, multiplier: 'D', points: 40 },
      ],
      total: 60,
      canUndo: true,
    });
    const texts = [...slotsRow()!.querySelectorAll('span')].map((s) => s.textContent);
    expect(texts).toEqual(['20', '40']);
    expect(sumLine()!.textContent).toBe('60');
  });

  it('applies the red flash classes when bustFlash is set', () => {
    renderDisplay({ bustFlash: true });
    expect(document.querySelector('[class*="bg-red-500/20"]')).not.toBeNull();
    expect(document.querySelector('[class*="border-red-500/40"]')).not.toBeNull();
  });

  it('disables the undo button when canUndo is false', () => {
    renderDisplay();
    expect(screen.getByRole('button', { name: /Undo dart/ })).toBeDisabled();
  });

  it('calls onUndo when the undo button is pressed and canUndo is true', async () => {
    const user = userEvent.setup();
    const { onUndo } = renderDisplay({ canUndo: true });
    await user.click(screen.getByRole('button', { name: /Undo dart/ }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});
