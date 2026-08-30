/** @jest-environment node */
import { AiService } from '../../server/services/ai.service';
import { config } from '../../server/config/env';

// Mock dependencies
jest.mock('../../server/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ error: null }),
    rpc: jest.fn().mockResolvedValue({ data: [], error: null })
  },
  getAuthSupabase: jest.fn()
}));

jest.mock('../../server/utils/pipeline', () => ({
  getExtractor: jest.fn().mockResolvedValue(async () => ({ data: new Float32Array(384).fill(0.1) }))
}));

// Provide fake config keys
config.primaryAiApiKey = 'test-primary';
config.primaryAiBaseUrl = 'http://test-primary.local';
config.secondaryAiApiKey = 'test-secondary';
config.secondaryAiBaseUrl = 'http://test-secondary.local';

describe('AiService', () => {
  let executeLoopMock: jest.SpyInstance;

  beforeEach(() => {
    executeLoopMock = jest.spyOn(AiService as any, 'executeLoop');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fallback to secondary/fallback clients when primary fails', async () => {
    // Fail first 2 attempts, succeed on 3rd
    executeLoopMock
      .mockRejectedValueOnce(new Error('Primary API down'))
      .mockRejectedValueOnce(new Error('Secondary API down'))
      .mockResolvedValueOnce({ success: true, dummy: "data" });

    config.secondaryAiApiKey = 'test-secondary';
    config.fallbackApiKeys = ['test-fallback-1'];

    const schema = { type: 'object', properties: { success: { type: 'boolean' } } };
    
    const result = await (AiService as any).executeWithFallback(
      [{ role: 'user', content: 'test' }],
      schema,
      'test_schema'
    );

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(executeLoopMock).toHaveBeenCalledTimes(3);
  });

  it('should throw Error if all keys fail', async () => {
    executeLoopMock.mockRejectedValue(new Error('API down'));

    config.secondaryAiApiKey = 'test-secondary';
    config.fallbackApiKeys = ['test-fallback-1'];

    const schema = { type: 'object', properties: { success: { type: 'boolean' } } };

    await expect((AiService as any).executeWithFallback(
      [{ role: 'user', content: 'test' }],
      schema,
      'test_schema'
    )).rejects.toThrow(/Exhausted/);
  });
});
