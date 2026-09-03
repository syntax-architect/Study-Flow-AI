/**
 * @jest-environment node
 */
import { config } from '../../server/config/env';
import { AiClient } from '../../server/services/ai/client';

describe('Fallback Chain End-to-End', () => {
  let originalPrimary: string | undefined;
  let originalSecondary: string | undefined;
  let originalFallback: (string | undefined)[];

  beforeAll(() => {
    originalPrimary = config.primaryAiApiKey;
    originalSecondary = config.secondaryAiApiKey;
    originalFallback = [...(config.fallbackApiKeys || [])];
  });

  afterEach(() => {
    // Restore config after every test
    config.primaryAiApiKey = originalPrimary;
    config.secondaryAiApiKey = originalSecondary;
    config.fallbackApiKeys = [...originalFallback] as string[];
  });

  const testMessages = [{ role: 'user', content: 'Say "hello"' }];
  // We use a small token limit to keep the test cheap and fast.
  const executeOpts = {
    messages: testMessages,
    endpoint: 'test-fallback',
    temperature: 0,
    max_tokens: 1,
    jsonSchema: {
      type: "object",
      properties: { result: { type: "string" } },
      additionalProperties: false,
      required: ["result"]
    }
  };

  it('1. should succeed via secondary provider when primary API key is invalid', async () => {
    // Override primary key with an invalid one
    config.primaryAiApiKey = 'invalid_primary_key';
    
    // We expect this to not throw, but successfully return using the secondary key
    const res = await AiClient.executeWithFallback(
      executeOpts.messages,
      executeOpts.jsonSchema,
      'test_schema',
      undefined,
      executeOpts.endpoint,
      executeOpts.temperature
    );
    
    expect(res).toBeDefined();
  }, 15000); // Allow time for network requests

  it('2. should succeed via tertiary Groq fallback when both primary and secondary keys are invalid', async () => {
    config.primaryAiApiKey = 'invalid_primary_key';
    config.secondaryAiApiKey = 'invalid_secondary_key';
    
    const res = await AiClient.executeWithFallback(
      executeOpts.messages,
      executeOpts.jsonSchema,
      'test_schema',
      undefined,
      executeOpts.endpoint,
      executeOpts.temperature
    );

    expect(res).toBeDefined();
  }, 20000);

  it('3. should throw specific "AI Engine Failure" error combining all provider errors when all keys are invalid', async () => {
    config.primaryAiApiKey = 'invalid_primary_key';
    config.secondaryAiApiKey = 'invalid_secondary_key';
    config.fallbackApiKeys = ['invalid_fallback_key'];

    let caughtError: Error | null = null;
    try {
      await AiClient.executeWithFallback(
        executeOpts.messages,
        executeOpts.jsonSchema,
        'test_schema',
        undefined,
        executeOpts.endpoint,
        executeOpts.temperature
      );
    } catch (e: any) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(Error);
    const errMsg = caughtError!.message;
    
    // Verify it contains the specific phrase and individual errors
    expect(errMsg).toContain('AI Engine Failure');
    expect(errMsg).toContain('Primary Error');
    expect(errMsg).toContain('Secondary Error');
    expect(errMsg).toContain('Fallback Errors');
    expect(errMsg).toMatch(/401|invalid|api_key|Authentication|Incorrect/i);
  }, 25000);
});
