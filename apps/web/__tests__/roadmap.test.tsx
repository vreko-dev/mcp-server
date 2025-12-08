import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import RoadmapClient from '../app/(marketing)/roadmap/client';

// Mock motion/react
vi.mock('motion/react', () => ({
  m: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
  },
}));

// Mock lucide icons
vi.mock('lucide-react', () => ({
  CheckCircle2: () => <div data-testid="icon-check" />,
  Circle: () => <div data-testid="icon-circle" />,
  ArrowRight: () => <div data-testid="icon-arrow" />,
}));

describe('Roadmap Page Client', () => {
  describe('Content Rendering', () => {
    it('should render the Roadmap title', () => {
      render(<RoadmapClient />);
      expect(screen.getByText(/Product Roadmap/i)).toBeInTheDocument();
    });

    it('should render all 2025 quarters', () => {
      render(<RoadmapClient />);
      expect(screen.getByText(/Q1 2025/i)).toBeInTheDocument();
      expect(screen.getByText(/Q2 2025/i)).toBeInTheDocument();
      expect(screen.getByText(/Q3 2025/i)).toBeInTheDocument();
      expect(screen.getByText(/Q4 2025/i)).toBeInTheDocument();
    });

    it('should render key milestones', () => {
      render(<RoadmapClient />);
      expect(screen.getByText(/Cloud Sync & Team Features/i)).toBeInTheDocument();
      expect(screen.getByText(/Advanced Guardian Detection/i)).toBeInTheDocument();
    });
  });

  describe('Timeline Structure', () => {
    it('should render milestone status indicators', () => {
      render(<RoadmapClient />);
      // Should have status icons (check/circle icons)
      const icons = screen.queryAllByTestId(/^icon-/);
      expect(icons.length).toBeGreaterThan(0);
    });
  });
});
