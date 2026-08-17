// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import ScoreInputPanel from '@/components/scoring/ScoreInputPanel';

const onSubmit = vi.fn();

/** Control matchMedia for the 768px guard. */
function setMedia(matches: boolean) {
  const mql = {
    matches, media: '(min-width: 768px)', onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  };
  window.matchMedia = vi.fn().mockReturnValue(mql);
}

beforeEach(() => {
  onSubmit.mockClear();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('ScoreInputPanel', () => {
  it('defaults to the 3 DARTS numeric pad', () => {
    render(<ScoreInputPanel onSubmit={onSubmit} currentScore={501} />);
    expect(screen.getByRole('button', { name: /BUST/ })).toBeInTheDocument(); // NumberPad-only
  });

  it('switches to 1 DART and records D20', async () => {
    const user = userEvent.setup();
    render(<ScoreInputPanel onSubmit={onSubmit} currentScore={501} />);
    await user.click(screen.getByRole('button', { name: /1 DART/ }));
    expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Double/ }));
    await user.click(screen.getByRole('button', { name: '20' }));
    expect(screen.getByText('40')).toBeInTheDocument();
  });

  it('hides BOARD below 768px (jsdom matchMedia default)', () => {
    setMedia(false);
    render(<ScoreInputPanel onSubmit={onSubmit} currentScore={501} />);
    expect(screen.queryByRole('button', { name: /BOARD/ })).not.toBeInTheDocument();
  });

  it('shows BOARD at/above 768px', () => {
    setMedia(true);
    render(<ScoreInputPanel onSubmit={onSubmit} currentScore={501} />);
    expect(screen.getByRole('button', { name: /BOARD/ })).toBeInTheDocument();
  });

  it('falls back to 1 DART when BOARD becomes unavailable mid-session', async () => {
    const user = userEvent.setup();
    setMedia(true);
    render(<ScoreInputPanel onSubmit={onSubmit} currentScore={501} />);
    await user.click(screen.getByRole('button', { name: /BOARD/ }));
    expect(screen.getByRole('img', { name: /Dartboard/ })).toBeInTheDocument();
    setMedia(false);
    fireEvent(window, new Event('resize'));
    expect(screen.queryByRole('img', { name: /Dartboard/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument(); // 1 DART pad
  });

  it('persists the selected mode in localStorage', async () => {
    const user = userEvent.setup();
    render(<ScoreInputPanel onSubmit={onSubmit} currentScore={501} />);
    await user.click(screen.getByRole('button', { name: /1 DART/ }));
    expect(localStorage.getItem('nomad-darts:score-input-mode')).toBe('single');
  });
});
