import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { Hero } from '../modules/marketing/home/components/Hero';

// Mock the HeroDemo component
vi.mock('@marketing/home/components/hero-demo', () => ({
  HeroDemo: () => <div data-testid="hero-demo">Hero Demo Component</div>,
}));

// Mock site config
vi.mock('@marketing/config/site-config', () => ({
  siteSpec: {
    pages: {
      home: {
        sections: {
          hero: {
            content: {
              founder_story: 'Test founder story content',
              trust_line: 'Local-first, privacy-focused',
              primary_cta: {
                subtext: 'Limited spots available',
              },
            },
          },
        },
      },
    },
  },
}));

// Mock lucide icons
vi.mock('lucide-react', () => ({
  Shield: () => <div data-testid="icon-shield" />,
}));

// Mock motion
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    p: ({ children, className, ...props }: any) => <p className={className} {...props}>{children}</p>,
    h1: ({ children, className, ...props }: any) => <h1 className={className} {...props}>{children}</h1>,
  },
}));

// Mock animations
vi.mock('@/lib/animations', () => ({
  animations: {
    fadeInUp: {},
  },
}));

// Mock AlphaBadge
vi.mock('@marketing/components/ui/alpha-badge', () => ({
  AlphaBadge: () => <div data-testid="alpha-badge">Private Alpha</div>,
}));

describe('Hero Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Content Rendering', () => {
    it('should render main heading with "Code Breaks" and "Snap Back" text', () => {
      render(<Hero />);

      expect(screen.getByText('Code Breaks.')).toBeInTheDocument();
      expect(screen.getByText('Snap Back.')).toBeInTheDocument();
    });

    it('should render "Snap Back" text with emerald green styling', () => {
      render(<Hero />);

      const snapBackText = screen.getByText('Snap Back.');
      expect(snapBackText).toHaveClass('text-green-500');
    });

    it('should render Alpha badge', () => {
      render(<Hero />);
      expect(screen.getByTestId('alpha-badge')).toBeInTheDocument();
    });

    it('should render Hero Demo component', () => {
      render(<Hero />);
      expect(screen.getByTestId('hero-demo')).toBeInTheDocument();
    });

    it('should render founder story text', () => {
      render(<Hero />);
      expect(screen.getByText(/Test founder story content/i)).toBeInTheDocument();
    });

    it('should render trust signals', () => {
      render(<Hero />);
      expect(screen.getByText(/Local-first, privacy-focused/i)).toBeInTheDocument();
      expect(screen.getByText(/Limited spots available/i)).toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('should have proper responsive font sizes for heading', () => {
      render(<Hero />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('text-4xl');
      expect(heading).toHaveClass('md:text-5xl');
      expect(heading).toHaveClass('lg:text-6xl');
    });

    it('should have emerald glow effect on "Snap Back" text', () => {
      render(<Hero />);

      const snapBackText = screen.getByText('Snap Back.');
      expect(snapBackText.className).toContain('drop-shadow');
      expect(snapBackText.className).toContain('52,211,153'); // RGB for emerald-400
    });
  });

  describe('Layout Structure', () => {
    it('should constrain Hero Demo to max-width for golden ratio', () => {
      render(<Hero />);

      const heroDemo = screen.getByTestId('hero-demo');
      const container = heroDemo.parentElement;
      expect(container?.className).toContain('max-w-5xl');
    });

    it('should have proper spacing between elements', () => {
      render(<Hero />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('mb-8');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<Hero />);

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toBeInTheDocument();
    });

    it('should have Shield icon for trust signal', () => {
      render(<Hero />);
      expect(screen.getByTestId('icon-shield')).toBeInTheDocument();
    });
  });
});
