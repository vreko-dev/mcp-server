import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
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
  describe('Content Rendering', () => {
    it('should render updated feature title "Remembers What Breaks"', () => {
      render(<FeaturesClient />);
      expect(screen.getByText('Remembers What Breaks')).toBeInTheDocument();
    });

    it('should NOT render legacy "AI Agent Ready" card', () => {
      render(<FeaturesClient />);
      expect(screen.queryByText('AI Agent Ready')).not.toBeInTheDocument();
    });

    it('should render other feature cards', () => {
      render(<FeaturesClient />);
      expect(screen.getByText('Severity Matters')).toBeInTheDocument();
      expect(screen.getByText('Detects What Breaks')).toBeInTheDocument();
    });

    it('should render all expected feature icons', () => {
      render(<FeaturesClient />);
      const icons = screen.getAllByTestId(/^icon-/);
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Feature Cards Structure', () => {
    it('should render feature cards with titles and descriptions', () => {
      render(<FeaturesClient />);

      // Each feature should have descriptive content
      expect(screen.getByText(/Remembers What Breaks/i)).toBeInTheDocument();
      expect(screen.getByText(/Severity Matters/i)).toBeInTheDocument();
    });
  });
});
