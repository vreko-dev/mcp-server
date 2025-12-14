import { describe, expect, it } from 'vitest';
import { getUserFlags } from '../procedures/get-user-flags';

describe('Pattern Verification', () => {
  const mockInput = {
    userId: 'test-user',
    context: {},
  };

  it('Check 1: Does procedure have .handler property?', () => {
    console.log('getUserFlags type:', typeof getUserFlags);
    console.log('Has .handler?:', 'handler' in getUserFlags);
    console.log('Type of .handler:', typeof (getUserFlags as any).handler);
    
    expect(getUserFlags).toBeDefined();
  });

  it('Check 2: Try calling with .handler()', async () => {
    try {
      const result = await (getUserFlags as any).handler({ input: mockInput });
      console.log('✅ .handler() pattern works!');
      console.log('Result:', result);
      expect(result).toBeDefined();
    } catch (error) {
      console.log('❌ .handler() pattern failed:', error);
      throw error;
    }
  });

  it('Check 3: Try direct call', async () => {
    try {
      const result = await (getUserFlags as any)({ input: mockInput });
      console.log('✅ Direct call pattern works!');
      console.log('Result:', result);
      expect(result).toBeDefined();
    } catch (error) {
      console.log('❌ Direct call pattern failed:', error);
      throw error;
    }
  });
});
