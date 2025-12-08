import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PricingClient from '../app/(marketing)/pricing/client';

// Mock UI components if strictly needed, but text content checks usually work well naturally.
// Mock motion/react to avoid animation issues
vi.mock('motion/react', () => ({
  m: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Analytics and Hooks
vi.mock('@analytics', () => ({
  AnalyticsEvents: {
    PRICING_TOGGLE_CHANGED: 'pricing_toggle_changed',
  },
}));
vi.mock('@analytics/hooks/use-time-on-page', () => ({
  useTimeOnPage: vi.fn(),
}));
vi.mock('posthog-js', () => ({
  default: {
    capture: vi.fn(),
  },
}));

describe('Pricing Page Client', () => {
  it('renders updated taglines', () => {
    // Current Taglines: "Perfect for trying SnapBack", "Most popular for individuals", "Best for teams of 3+"
    // New Taglines: "Catches your mistakes", "Learns your codebase", "Shared protection"

    // This test expects the NEW taglines
    render(<PricingClient />);

    // Fail until implemented
    expect(screen.getByText('Catches your mistakes')).toBeInTheDocument();
    expect(screen.getByText('Learns your codebase')).toBeInTheDocument();
    expect(screen.getByText('Shared protection')).toBeInTheDocument();
  });

  it('does NOT render "Coming Soon" badge in Free tier', () => {
    render(<PricingClient />);

    // We expect "Coming Soon" to be gone in the Free Tier context
    // The previous implementation had "Coming Soon" text inside badges.
    // We can query for text "Coming Soon" and ensure it's not present or significantly reduced.
    // There were 3 usages. We expect 0 or fewer if we only removed from Free.
    // Wait, requirement: "Remove 'Coming Soon' badges from feature lists".
    // This implies removing ALL of them in the feature lists (CLI tool, Local MCP scan, Backend MCP server).

    expect(screen.queryByText('Coming Soon')).not.toBeInTheDocument();
  });
});
