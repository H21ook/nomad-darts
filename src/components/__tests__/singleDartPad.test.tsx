// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import SingleDartPad from '@/components/scoring/SingleDartPad';

// vitest globals are disabled (see vitest.config.ts), so RTL's auto-cleanup
// never registers — without this, renders accumulate in document.body and
// queries hit "multiple elements" across tests. Same pattern as matchFlow.test.tsx.
afterEach(() => {
  cleanup();
});

function renderPad(overrides: { currentScore?: number; checkout?: 'double' | 'straight' } = {}) {
  const onSubmit = vi.fn();
  render(
    <SingleDartPad
      onSubmit={onSubmit}
      currentScore={overrides.currentScore ?? 301}
      checkout={overrides.checkout ?? 'double'}
    />
  );
  return { onSubmit };
}

const slotsRow = () => document.querySelector<HTMLElement>('div.grid.grid-cols-3');
const sumLine = () => document.querySelector<HTMLElement>('span.text-zinc-600');

describe('SingleDartPad', () => {
  it('records D20 = 40 after Double then 20, then resets to single', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderPad();
    await user.click(screen.getByRole('button', { name: /Double/ }));
    await user.click(screen.getByRole('button', { name: '20' }));
    expect(within(slotsRow()!).getByText('40')).toBeInTheDocument(); // first slot
    expect(sumLine()!.textContent).toBe('40');                       // dim sum
    await user.click(screen.getByRole('button', { name: '20' }));
    expect(within(slotsRow()!).getByText('20')).toBeInTheDocument(); // second slot
    expect(within(slotsRow()!).getByText('40')).toBeInTheDocument(); // first slot stays
    expect(sumLine()!.textContent).toBe('60');                       // 40 + S20
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('auto-submits on the 3rd dart', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderPad();
    await user.click(screen.getByRole('button', { name: '20' }));
    await user.click(screen.getByRole('button', { name: '20' }));
    await user.click(screen.getByRole('button', { name: '20' }));
    expect(onSubmit).toHaveBeenCalledWith(60, 3, false);
  });

  it('busts immediately on the 1st dart when exceeding the remaining score', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderPad({ currentScore: 10 });
    await user.click(screen.getByRole('button', { name: '20' }));
    expect(onSubmit).toHaveBeenCalledWith(0, 1, true);
  });

  it('finishes double-out with a double; a single on the same number busts', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderPad({ currentScore: 40 });
    await user.click(screen.getByRole('button', { name: /Double/ }));
    await user.click(screen.getByRole('button', { name: '20' }));
    expect(onSubmit).toHaveBeenCalledWith(40, 1, false);

    onSubmit.mockClear();
    await user.click(screen.getByRole('button', { name: '20' }));
    expect(onSubmit).toHaveBeenCalledWith(0, 1, true);
  });

  it('undoDart removes the last dart and restores the total', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderPad();
    await user.click(screen.getByRole('button', { name: '20' }));
    await user.click(screen.getByRole('button', { name: '20' }));
    await user.click(screen.getByRole('button', { name: /Undo/ }));
    expect(within(slotsRow()!).getByText('20')).toBeInTheDocument();
    expect(sumLine()!.textContent).toBe('20');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks Triple on 25 and Double/Triple on BULL', async () => {
    const user = userEvent.setup();
    renderPad();
    await user.click(screen.getByRole('button', { name: /Triple/ }));
    expect(screen.getByRole('button', { name: '25' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /BULL/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Double/ }));
    expect(screen.getByRole('button', { name: /BULL/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: '25' })).toBeEnabled();
  });

  it('records Double + 25 = 50 (same as BULL)', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderPad({ currentScore: 201 });
    await user.click(screen.getByRole('button', { name: /Double/ }));
    await user.click(screen.getByRole('button', { name: '25' }));
    expect(within(slotsRow()!).getByText('50')).toBeInTheDocument();
    expect(sumLine()!.textContent).toBe('50');
    await user.click(screen.getByRole('button', { name: /BULL/ }));
    await user.click(screen.getByRole('button', { name: '20' }));
    expect(onSubmit).toHaveBeenCalledWith(120, 3, false); // 50 + 50 + 20
  });
});