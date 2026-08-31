/** @jest-environment node */
import { AiService } from '../../server/services/ai.service';
import { AiClient } from '../../server/services/ai/client';
import { config } from '../../server/config/env';

// Mock dependencies
jest.mock('../../server/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ error: null }),
    rpc: jest.fn().mockResolvedValue({ data: [], error: null })
  },
  getAuthSupabase: jest.fn(),
  adminSupabase: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ error: null }),
    rpc: jest.fn().mockResolvedValue({ data: [], error: null })
  }
}));

jest.mock('../../server/utils/pipeline', () => ({
  getExtractor: jest.fn().mockResolvedValue(async () => ({ data: new Float32Array(384).fill(0.1) }))
}));

// Provide fake config keys
config.primaryAiApiKey = 'test-primary';
config.primaryAiBaseUrl = 'http://test-primary.local';
config.secondaryAiApiKey = 'test-secondary';
config.secondaryAiBaseUrl = 'http://test-secondary.local';
config.useNewAiArchitecture = false;

describe('AiService', () => {
  let executeLoopMock: jest.SpyInstance;
  let sleepMock: jest.SpyInstance;

  beforeEach(() => {
    // Spy on AiClient.executeLoop — AiService.executeWithFallback calls this.executeLoop which
    // resolves to AiClient.executeLoop for static methods.
    executeLoopMock = jest.spyOn(AiClient as any, 'executeLoop');
    // Mock sleep to avoid real delays during retries
    sleepMock = jest.spyOn(AiClient as any, 'sleep').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fallback to secondary/fallback clients when primary fails', async () => {
    // Fail first 2 attempts, succeed on 3rd
    executeLoopMock
      .mockRejectedValueOnce(new Error('Primary API down'))
      .mockRejectedValueOnce(new Error('Secondary API down'))
      .mockResolvedValueOnce({ success: true, dummy: 'data' });

    config.secondaryAiApiKey = 'test-secondary';
    config.fallbackApiKeys = ['test-fallback-1'];

    const schema = { type: 'object', properties: { success: { type: 'boolean' } } };

    const result = await (AiClient as any).executeWithFallback(
      [{ role: 'user', content: 'test' }],
      schema,
      'test_schema'
    );

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(executeLoopMock).toHaveBeenCalledTimes(3);
  }, 15000);

  it('should throw Error if all keys fail', async () => {
    executeLoopMock.mockRejectedValue(new Error('API down'));

    config.secondaryAiApiKey = 'test-secondary';
    config.fallbackApiKeys = ['test-fallback-1'];

    const schema = { type: 'object', properties: { success: { type: 'boolean' } } };

    await expect((AiClient as any).executeWithFallback(
      [{ role: 'user', content: 'test' }],
      schema,
      'test_schema'
    )).rejects.toThrow(/Exhausted/);
  }, 15000);
});
