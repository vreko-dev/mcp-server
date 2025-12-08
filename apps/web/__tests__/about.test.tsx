import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AboutClient from '../app/(marketing)/about/client';

// Mock UI components
vi.mock('motion/react', () => ({
  m: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
  },
}));

describe('About Page Client', () => {
  it('renders the Origin Story', () => {
    render(<AboutClient />);
    expect(screen.getByText(/\$12K Disaster/i)).toBeInTheDocument();
  });

  it('renders Founder info (Marcelle)', () => {
    render(<AboutClient />);
    // Will fail until implemented
    const elements = screen.getAllByText(/Marcelle/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('does NOT render Roadmap section', () => {
    render(<AboutClient />);
    // "What's Next" title from roadmap section
    expect(screen.queryByText("What's Next")).not.toBeInTheDocument();
  });

  it('does NOT render Stats section', () => {
    render(<AboutClient />);
    // "Snapshot Creation Speed" header from stats
    expect(screen.queryByText("Snapshot Creation Speed")).not.toBeInTheDocument();
  });
});
