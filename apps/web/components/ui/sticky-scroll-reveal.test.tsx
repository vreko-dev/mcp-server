import { render, screen } from '@testing-library/react';
import { StickyScrollReveal } from './sticky-scroll-reveal';
import { describe, it, expect } from 'vitest';

describe('StickyScrollReveal', () => {
  const content = [
    {
      title: 'Title 1',
      description: 'Description 1',
      content: <div>Content 1</div>,
    },
    {
      title: 'Title 2',
      description: 'Description 2',
      content: <div>Content 2</div>,
    },
  ];

  it('renders title and description', () => {
    render(<StickyScrollReveal content={content} />);
    expect(screen.getByText('Title 1')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
  });
});
