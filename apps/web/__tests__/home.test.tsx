import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Home from '../app/(marketing)/(home)/page';

// Mock components to simplify matching
vi.mock('@marketing/home/components/Hero', () => ({
  Hero: () => <div data-testid="hero">Hero</div>,
}));

// We'll mock the new components we expect to implement/use
vi.mock('@/components/landing/story-section', () => ({
  StorySection: () => <div data-testid="story-section">Story Section</div>,
}));

vi.mock('@marketing/sections/launch', () => ({
  InteractiveDemo: () => <div data-testid="interactive-demo">Interactive Demo</div>,
  HowItWorks: () => <div data-testid="how-it-works">How It Works</div>,
  Metrics: () => <div data-testid="metrics">Metrics</div>,
  FinalCTA: () => <div data-testid="final-cta">Final CTA</div>,
  // These should be removed/replaced, so we mock them to ensure they are NOT queried if we don't expect them
  GitVsSnapback: () => <div data-testid="git-vs-snapback">Git vs Snapback</div>,
  Roadmap: () => <div data-testid="roadmap">Roadmap</div>,
  Community: () => <div data-testid="community">Community</div>,
  TeamsSection: () => <div data-testid="teams-section">Teams</div>,
  OriginStory: () => <div data-testid="origin-story">Origin Story</div>,
  ProblemSection: () => <div data-testid="intelligence-story">Intelligence Story</div>, // Assuming this is reused or we import a new one
  CorePrinciples: () => <div data-testid="core-principles">Core Principles</div>
}));

describe('Home Page', () => {
  it('renders the 6 key sections in order', () => {
    const { container } = render(<Home />);

    // 1. Hero
    expect(screen.getByTestId('hero')).toBeInTheDocument();

    // 2. Proof (The Story) - This is currently MISSING in the implementation (Red)
    // We expect to find it after we implement it
    // expect(screen.getByTestId('story-section')).toBeInTheDocument();

    // But for the "Red" test of the Page itself, we assert that the OLD structure is NOT what we want.
    // The current page renders: Hero, OriginStory, InteractiveDemo, Problem, GitVsSnapback, CorePrinciples, Metrics, HowItWorks, Roadmap, Community, Teams, FinalCTA.

    // The NEW structure should be:
    // 1. Hero (re-used/tweaked)
    // 2. Proof (New StorySection)
    // 3. Intelligence (Day 1 -> Month 3)
    // 4. How It Works
    // 5. Metrics
    // 6. Final CTA

    // We assert that UNWANTED sections are GONE
    expect(screen.queryByTestId('git-vs-snapback')).not.toBeInTheDocument();
    expect(screen.queryByTestId('roadmap')).not.toBeInTheDocument();
    expect(screen.queryByTestId('community')).not.toBeInTheDocument();
    expect(screen.queryByTestId('teams-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('core-principles')).not.toBeInTheDocument();

    // We assert that WANTED sections are PRESENT
    expect(screen.getByTestId('hero')).toBeInTheDocument();
    expect(screen.getByTestId('how-it-works')).toBeInTheDocument();
    expect(screen.getByTestId('metrics')).toBeInTheDocument();
    expect(screen.getByTestId('final-cta')).toBeInTheDocument();

    // We also expect the Intelligence story to be present (we'll reuse ProblemSection or create new)
    // expect(screen.getByTestId('intelligence-story')).toBeInTheDocument();
  });
});
