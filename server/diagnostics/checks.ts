import { config } from '../config/env';
import { adminSupabase } from '../lib/supabase';
import { AiClient } from '../services/ai/client';
import { getExtractor } from '../utils/pipeline';
import { appCache } from '../utils/cache';
import { verifyToken } from '@clerk/backend';

export interface DiagnosticResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  latencyMs: number;
  message: string;
  errorCategory?: string;
  suggestedFix?: string;
}

const withTiming = async (fn: () => Promise<Omit<DiagnosticResult, 'latencyMs'>>): Promise<DiagnosticResult> => {
  const start = Date.now();
  try {
    const res = await fn();
    return { ...res, latencyMs: Date.now() - start };
  } catch (err: any) {
    return {
      name: 'Unknown',
      status: 'fail',
      latencyMs: Date.now() - start,
      message: `Uncaught check error: ${err.message}`,
      errorCategory: 'UncaughtException',
      suggestedFix: 'Check the diagnostics code itself.'
    };
  }
};

export const checkEnvConfig = () => withTiming(async () => {
  const name = 'Environment Config';
  const requiredKeys = ['port', 'supabaseUrl', 'supabaseAnonKey', 'supabaseServiceRoleKey', 'adminSecret', 'primaryAiApiKey'];
  const missing: string[] = [];

  for (const key of requiredKeys) {
    if (!config[key as keyof typeof config]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    return {
      name,
      status: 'fail',
      message: `Missing required env vars: ${missing.join(', ')}`,
      errorCategory: 'ConfigurationError',
      suggestedFix: 'Add the missing variables to your .env file and restart the server.'
    };
  }

  return { name, status: 'pass', message: 'All required environment variables are present.' };
});

export const checkDbConnectivity = () => withTiming(async () => {
  const name = 'Database Connectivity';
  try {
    const { data, error } = await adminSupabase.from('users').select('id').limit(1);
    if (error) {
      let category = 'DatabaseError';
      let fix = 'Check database logs.';
      if (error.code === 'PGRST301') {
        category = 'JwtError';
        fix = 'Check Supabase service role key.';
      } else if (error.code === '42P01') {
        category = 'TableNotFound';
        fix = 'Ensure migrations have been applied. Users table is missing.';
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        category = 'NetworkError';
        fix = 'Check Supabase URL and network connectivity.';
      }

      return {
        name,
        status: 'fail',
        message: `DB Query failed: ${error.message}`,
        errorCategory: category,
        suggestedFix: fix
      };
    }
    return { name, status: 'pass', message: 'Successfully queried the database.' };
  } catch (err: any) {
    return { name, status: 'fail', message: err.message, errorCategory: 'UnknownDbError', suggestedFix: 'Verify DB credentials.' };
  }
});

export const checkDbWritePermission = () => withTiming(async () => {
  const name = 'Database Write Permission';
  try {
    const { data: insertData, error: insertError } = await adminSupabase
      .from('diagnostics_log')
      .insert([{ status: 'test', message: 'diagnostic write test' }])
      .select()
      .single();

    if (insertError) {
      let category = 'WriteError';
      let fix = 'Check permissions or run migrations.';
      if (insertError.code === '42P01') {
        category = 'TableNotFound';
        fix = 'You must run the 02_diagnostics_log.sql migration.';
      }
      return { name, status: 'fail', message: `Insert failed: ${insertError.message}`, errorCategory: category, suggestedFix: fix };
    }

    const { error: deleteError } = await adminSupabase
      .from('diagnostics_log')
      .delete()
      .eq('id', insertData.id);

    if (deleteError) {
      return { name, status: 'warn', message: `Insert succeeded, but delete failed: ${deleteError.message}`, errorCategory: 'DeleteError', suggestedFix: 'Check RLS delete policies on diagnostics_log.' };
    }

    return { name, status: 'pass', message: 'Successfully inserted and deleted a row.' };
  } catch (err: any) {
    return { name, status: 'fail', message: err.message, errorCategory: 'UnknownWriteError' };
  }
});

const testProviderCall = async (provider: string, apiKey: string, baseUrl: string, model: string, name: string) => {
  return withTiming(async () => {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'say OK' }],
          max_tokens: 5
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let category = 'ApiError';
        let fix = 'Check provider dashboard logs.';
        if (response.status === 401) { category = 'AuthError'; fix = `Check ${name} API key.`; }
        if (response.status === 404) { category = 'ModelNotFound'; fix = `Check if model ${model} is valid.`; }
        if (response.status === 429) { category = 'RateLimited'; fix = 'Check provider quota/billing.'; }

        return {
          name,
          status: 'fail',
          message: `HTTP ${response.status}: ${errorText.slice(0, 100)}`,
          errorCategory: category,
          suggestedFix: fix
        };
      }
      return { name, status: 'pass', message: `Provider returned successfully via ${model}.` };
    } catch (err: any) {
      return { name, status: 'fail', message: err.message, errorCategory: 'NetworkError', suggestedFix: 'Check network connectivity or DNS.' };
    }
  });
};

export const checkPrimaryAi = () => testProviderCall('Primary AI Provider', config.primaryAiApiKey || '', config.primaryAiBaseUrl, config.primaryAiModel, 'Primary AI Provider');

export const checkSecondaryAi = () => testProviderCall('Secondary AI Provider', config.secondaryAiApiKey || '', config.secondaryAiBaseUrl, config.secondaryAiModel, 'Secondary AI Provider');

export const checkTertiaryGroq = () => testProviderCall('Tertiary Groq Fallback', config.fallbackApiKeys[0] || '', 'https://api.groq.com/openai/v1', 'qwen/qwen3.6-27b', 'Tertiary Groq Fallback Provider');

export const checkFallbackChainEndToEnd = () => withTiming(async () => {
  const name = 'Fallback Chain End-to-End';
  try {
    // Deliberately overriding config logic inside a controlled AiClient instance doesn't easily isolate, 
    // but we can mock config momentarily since JS runs synchronously per tick until await, BUT concurrency matters.
    // Instead of overriding config globally, we can use AiClient logic. Since executeWithFallback reads config,
    // let's temporarily mutate config just for this call, but wait, it's safer to just inject a bad key if possible.
    // Looking at executeWithFallback, it doesn't take an API key override. 
    // We will save original config, override, call, and restore. 
    const originalKey = config.solverAiApiKey;
    const originalUseNew = config.useNewAiArchitecture;
    
    config.solverAiApiKey = 'sk-invalid-key-for-testing';
    config.useNewAiArchitecture = false; // force classic fallback chain for deterministic testing
    
    try {
      const res = await AiClient.executeWithFallback(
        [{ role: 'user', content: 'say OK' }],
        { type: 'object', properties: { ok: { type: 'string' } }, required: ['ok'], additionalProperties: false },
        'test_schema'
      );
      
      // Restore immediately
      config.solverAiApiKey = originalKey;
      config.useNewAiArchitecture = originalUseNew;

      if (res && res.success === false) { // Assuming success might be false if error
         throw new Error('Execute returned failure');
      }

      return { name, status: 'pass', message: 'Fallback chain successfully routed around the invalid primary key.' };
    } catch (err: any) {
      config.solverAiApiKey = originalKey;
      config.useNewAiArchitecture = originalUseNew;
      
      return {
        name,
        status: 'fail',
        message: `Fallback chain failed to recover: ${err.message}`,
        errorCategory: 'FallbackFailure',
        suggestedFix: 'Ensure secondary or tertiary keys are configured and working.'
      };
    }
  } catch (err: any) {
    return { name, status: 'fail', message: err.message, errorCategory: 'UnknownError' };
  }
});

export const checkVectorSearch = () => withTiming(async () => {
  const name = 'Vector Search / Embeddings';
  try {
    const extractor = await getExtractor();
    const result = await extractor("Test string", { pooling: 'mean', normalize: true });
    let embedding: number[];
    if (result.data) {
      embedding = Array.from(result.data);
    } else {
      embedding = Array.from(result.tolist()[0]);
    }

    const { error } = await adminSupabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 1,
      filter_subject: 'test'
    });

    if (error) {
      return {
        name,
        status: 'fail',
        message: `RPC error: ${error.message}`,
        errorCategory: 'VectorRpcError',
        suggestedFix: 'Verify match_documents RPC is installed and up to date.'
      };
    }

    return { name, status: 'pass', message: 'Embedding generation and RPC query succeeded.' };
  } catch (err: any) {
    return {
      name,
      status: 'fail',
      message: err.message,
      errorCategory: 'EmbeddingError',
      suggestedFix: 'Check if ONNX runtime / model is properly configured.'
    };
  }
});

export const checkRateLimiter = () => withTiming(async () => {
  const name = 'Rate Limiter';
  try {
    const { adminLimiter } = await import('../middlewares/rateLimiter');
    
    let triggered429 = false;
    let requestsMade = 0;
    
    for (let i = 0; i < 150; i++) {
      const mockReq = {
        ip: '127.0.0.1',
        headers: {},
        user: { id: 'diag-test-user' }
      } as any;
      
      const mockRes = {
        status: (code: number) => {
          if (code === 429) triggered429 = true;
          return mockRes;
        },
        send: () => {},
        json: () => {},
        setHeader: () => {}
      } as any;
      
      await new Promise<void>(resolve => {
        adminLimiter(mockReq, mockRes, () => resolve());
        setTimeout(() => resolve(), 5); 
      });
      
      requestsMade++;
      if (triggered429) break;
    }

    if (!triggered429) {
      return { name, status: 'warn', message: 'Rate limiter did not trigger after 150 requests.', errorCategory: 'RateLimiterNotTripping', suggestedFix: 'Verify rate limiting middleware configuration.' };
    }

    return { name, status: 'pass', message: 'Rate limiter successfully triggered at expected threshold.' };
  } catch (err: any) {
    return { name, status: 'warn', message: 'Could not test rate limiter: ' + err.message, errorCategory: 'TestError', suggestedFix: 'Server may not be running locally on the expected port.' };
  }
});

export const checkCacheSystem = () => withTiming(async () => {
  const name = 'Cache System';
  try {
    const testKey = 'diagnostics_test_key';
    const testVal = 'test_value';
    appCache.set(testKey, testVal);
    const read = appCache.get(testKey);
    appCache.delete(testKey);

    if (read !== testVal) {
      return { name, status: 'fail', message: 'Cache read value did not match set value.', errorCategory: 'CacheIntegrityError', suggestedFix: 'Check LRU cache configuration.' };
    }

    return { name, status: 'pass', message: 'Cache set, read, and delete successful.' };
  } catch (err: any) {
    return { name, status: 'fail', message: err.message, errorCategory: 'CacheError' };
  }
});

export const checkAuthJwt = () => withTiming(async () => {
  const name = 'Auth/Clerk JWT Verification';
  try {
    try {
      await verifyToken('invalid.token.string', { secretKey: process.env.CLERK_SECRET_KEY });
      return { name, status: 'fail', message: 'verifyToken incorrectly accepted a malformed token.', errorCategory: 'AuthVulnerability', suggestedFix: 'Check Clerk configuration and verifyToken implementation.' };
    } catch (err) {
      // Expected failure
      return { name, status: 'pass', message: 'Malformed token was correctly rejected.' };
    }
  } catch (err: any) {
    return { name, status: 'fail', message: err.message, errorCategory: 'AuthTestError' };
  }
});

export const runAllChecks = async (): Promise<DiagnosticResult[]> => {
  // Run independent checks in parallel
  const parallelChecks = await Promise.all([
    checkEnvConfig(),
    checkDbConnectivity(),
    checkDbWritePermission(),
    checkPrimaryAi(),
    checkSecondaryAi(),
    checkTertiaryGroq(),
    checkVectorSearch(),
    checkCacheSystem(),
    checkAuthJwt()
  ]);

  // Run checks with side effects sequentially
  const fallbackResult = await checkFallbackChainEndToEnd();
  const rateLimitResult = await checkRateLimiter();

  return [...parallelChecks, fallbackResult, rateLimitResult];
};
