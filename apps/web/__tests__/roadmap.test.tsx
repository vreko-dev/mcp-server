import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RoadmapClient from '../app/(marketing)/roadmap/client';

// Mock motion/react
vi.mock('motion/react', () => ({
  m: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
  },
}));

describe('Roadmap Page Client', () => {
  it('renders the Roadmap title', () => {
    render(<RoadmapClient />);
    expect(screen.getByText(/Product Roadmap/i)).toBeInTheDocument();
  });

  it('renders all quarters', () => {
    render(<RoadmapClient />);
    expect(screen.getByText(/Q1 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/Q2 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/Q3 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/Q4 2025/i)).toBeInTheDocument();
  });

  it('renders key milestones', () => {
    render(<RoadmapClient />);
    expect(screen.getByText(/Cloud Sync & Team Features/i)).toBeInTheDocument();
    expect(screen.getByText(/Advanced Guardian Detection/i)).toBeInTheDocument();
  });
});
