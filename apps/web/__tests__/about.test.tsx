import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import AboutClient from '../app/(marketing)/about/client';

// Mock UI components
vi.mock('motion/react', () => ({
  m: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
  },
}));

describe('About Page Client', () => {
  describe('Content Rendering', () => {
    it('should render the Origin Story section', () => {
      render(<AboutClient />);
      expect(screen.getByText(/\$12K Disaster/i)).toBeInTheDocument();
    });

    it('should render Founder section with Marcelle info', () => {
      render(<AboutClient />);
      const elements = screen.getAllByText(/Marcelle/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Removed Sections', () => {
    it('should NOT render Roadmap section', () => {
      render(<AboutClient />);
      expect(screen.queryByText("What's Next")).not.toBeInTheDocument();
    });

    it('should NOT render Stats section', () => {
      render(<AboutClient />);
      expect(screen.queryByText("Snapshot Creation Speed")).not.toBeInTheDocument();
    });
  });

  describe('Page Structure', () => {
    it('should render mission/values sections', () => {
      render(<AboutClient />);
      // Should have mission content
      expect(screen.getByText(/Mission & Values/i)).toBeInTheDocument();
    });
  });
});
