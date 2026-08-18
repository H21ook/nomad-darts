// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ScoreInputPanel from '@/components/scoring/ScoreInputPanel';

const onSubmit = vi.fn();

afterEach(() => {
  cleanup();
});

describe('ScoreInputPanel', () => {
  it('renders the NumberPad for mode "three"', () => {
    render(<ScoreInputPanel mode="three" onSubmit={onSubmit} currentScore={501} />);
    expect(screen.getByRole('button', { name: /BUST/ })).toBeInTheDocument(); // NumberPad-only marker
  });

  it('renders the SingleDartPad for mode "single"', () => {
    render(<ScoreInputPanel mode="single" onSubmit={onSubmit} currentScore={501} />);
    expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument(); // segment button
  });

  it('renders the DartBoardPad for mode "board"', () => {
    render(<ScoreInputPanel mode="board" onSubmit={onSubmit} currentScore={501} />);
    expect(screen.getByRole('img', { name: /Dartboard/ })).toBeInTheDocument();
  });

  it('renders no mode tab buttons', () => {
    render(<ScoreInputPanel mode="three" onSubmit={onSubmit} currentScore={501} />);
    expect(screen.queryByRole('button', { name: /1 DART/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /BOARD/ })).not.toBeInTheDocument();
  });

  it('keeps the NumberPad root classes (p-2 gap-2 bg-black)', () => {
    const { container } = render(<ScoreInputPanel mode="three" onSubmit={onSubmit} currentScore={501} />);
    expect(container.querySelector('div.p-2.gap-2.bg-black')).not.toBeNull();
  });

  it('switches pads when mode changes', () => {
    const { rerender } = render(<ScoreInputPanel mode="three" onSubmit={onSubmit} currentScore={501} />);
    expect(screen.getByRole('button', { name: /BUST/ })).toBeInTheDocument();

    rerender(<ScoreInputPanel mode="single" onSubmit={onSubmit} currentScore={501} />);
    expect(screen.queryByRole('button', { name: /BUST/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument();
  });
});