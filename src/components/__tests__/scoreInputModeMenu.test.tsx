// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import ScoreInputModeMenu from '@/components/scoring/ScoreInputModeMenu';

const onSelect = vi.fn();

afterEach(() => {
  cleanup();
  onSelect.mockClear();
});

describe('ScoreInputModeMenu', () => {
  it('renders a Settings button with the popover hidden by default', () => {
    render(<ScoreInputModeMenu mode="three" onSelect={onSelect} isLarge />);
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '3 DARTS' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '1 DART' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'BOARD' })).not.toBeInTheDocument();
  });

  it('opens the popover on press with 3 DARTS, 1 DART and BOARD when isLarge', async () => {
    const user = userEvent.setup();
    render(<ScoreInputModeMenu mode="three" onSelect={onSelect} isLarge />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('button', { name: '3 DARTS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 DART' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'BOARD' })).toBeInTheDocument();
  });

  it('hides BOARD when isLarge is false', async () => {
    const user = userEvent.setup();
    render(<ScoreInputModeMenu mode="three" onSelect={onSelect} isLarge={false} />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('button', { name: '3 DARTS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 DART' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'BOARD' })).not.toBeInTheDocument();
  });

  it('marks the active mode with a check icon', async () => {
    const user = userEvent.setup();
    render(<ScoreInputModeMenu mode="single" onSelect={onSelect} isLarge />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const active = screen.getByRole('button', { name: '1 DART' });
    const inactive = screen.getByRole('button', { name: '3 DARTS' });
    expect(active.querySelector('svg')).not.toBeNull();
    expect(inactive.querySelector('svg')).toBeNull();
  });

  it('calls onSelect with the chosen mode and closes the popover', async () => {
    const user = userEvent.setup();
    render(<ScoreInputModeMenu mode="three" onSelect={onSelect} isLarge />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: '1 DART' }));
    expect(onSelect).toHaveBeenCalledWith('single');
    // Popover unmounts after the ~0.1s exit animation — wait for it.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '1 DART' })).not.toBeInTheDocument()
    );
  });

  it('closes on backdrop press without calling onSelect', async () => {
    const user = userEvent.setup();
    const { container } = render(<ScoreInputModeMenu mode="three" onSelect={onSelect} isLarge />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const backdrop = container.querySelector('div.fixed.inset-0');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as HTMLElement);
    expect(onSelect).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '3 DARTS' })).not.toBeInTheDocument()
    );
  });

  it('closes on Escape key', async () => {
    const user = userEvent.setup();
    render(<ScoreInputModeMenu mode="three" onSelect={onSelect} isLarge />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '3 DARTS' })).not.toBeInTheDocument()
    );
    expect(onSelect).not.toHaveBeenCalled();
  });
});