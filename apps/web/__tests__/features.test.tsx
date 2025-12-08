import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FeaturesClient from '../app/(marketing)/features/client';

// Mock Lucide icons to avoid rendering issues
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="icon-alert" />,
  Brain: () => <div data-testid="icon-brain" />,
  Clock: () => <div data-testid="icon-clock" />,
  Plug: () => <div data-testid="icon-plug" />,
  Shield: () => <div data-testid="icon-shield" />,
  Zap: () => <div data-testid="icon-zap" />,
}));

// Mock motion to avoid animation issues
vi.mock('motion/react', () => ({
  m: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
  },
}));

describe('Features Page Client', () => {
  it('renders updated feature titles and removes legacy ones', () => {
    render(<FeaturesClient />);

    // Expect "Remembers What Breaks" instead of "Pattern Memory"
    expect(screen.getByText('Remembers What Breaks')).toBeInTheDocument();

    // Expect "AI Agent Ready" to be GONE
    expect(screen.queryByText('AI Agent Ready')).not.toBeInTheDocument();

    // Expect other cards to remain
    expect(screen.getByText('Severity Matters')).toBeInTheDocument();
    expect(screen.getByText('Detects What Breaks')).toBeInTheDocument();
  });
});
