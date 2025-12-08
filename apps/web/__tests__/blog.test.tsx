import { describe, it, expect, vi } from 'vitest';
import { getAllPosts } from '../modules/marketing/blog/utils/lib/posts';

// We can test the utility directly since it runs in node environment and reads files.
// We just need to make sure it picks up our new file.

describe('Blog Posts', () => {
  it('loads the $12k AI Disaster post', async () => {
    const posts = await getAllPosts();
    const disasterPost = posts.find((p) => p.title.includes('$12k AI Disaster'));

    expect(disasterPost).toBeDefined();
    expect(disasterPost?.published).toBe(true);
    expect(disasterPost?.tags).toContain('Post-Mortem');
  });
});
