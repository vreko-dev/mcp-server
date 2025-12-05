import type { TestRunnerConfig } from '@storybook/test-runner';
import { getStoryContext } from '@storybook/test-runner';

const config: TestRunnerConfig = {
  // Hook that runs before each story is rendered
  async preRender(page) {
    // Optional: Add custom setup before rendering
    // Example: Set cookies, local storage, etc.
  },

  // Hook that runs after each story is rendered
  async postRender(page, context) {
    // Get the story context
    const storyContext = await getStoryContext(page, context);

    // Wait for fonts to load to avoid flaky visual tests
    await page.evaluate(() => document.fonts.ready);

    // Disable animations for consistent visual testing
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });

    // Wait for any images to load
    await page.evaluate(() => {
      const images = Array.from(document.images);
      return Promise.all(
        images
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.addEventListener('load', resolve);
                img.addEventListener('error', resolve);
              })
          )
      );
    });

    // Wait a bit for any final rendering
    await page.waitForTimeout(100);

    // Skip a11y tests if disabled for this story
    if (storyContext.parameters?.a11y?.disable) {
      return;
    }

    // Optional: Add custom accessibility checks here
    // The addon-a11y will handle most cases automatically
  },

  // Tags to include/exclude
  tags: {
    include: ['test'],
    exclude: ['skip-test'],
  },
};

export default config;
