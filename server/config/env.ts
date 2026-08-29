import 'dotenv/config';
export const config = {
  port: Number(process.env.PORT) || 3000,
  primaryAiApiKey: process.env.PRIMARY_AI_API_KEY,
  primaryAiBaseUrl: process.env.PRIMARY_AI_BASE_URL || 'https://api.openai.com/v1',
  primaryAiModel: process.env.PRIMARY_AI_MODEL || 'gpt-4o-mini',
  secondaryAiApiKey: process.env.SECONDARY_AI_API_KEY,
  secondaryAiBaseUrl: process.env.SECONDARY_AI_BASE_URL || 'https://api.openai.com/v1',
  secondaryAiModel: process.env.SECONDARY_AI_MODEL || 'gpt-3.5-turbo',
  
  solverAiApiKey: process.env.SOLVER_AI_API_KEY || process.env.PRIMARY_AI_API_KEY,
  solverAiBaseUrl: process.env.SOLVER_AI_BASE_URL || process.env.PRIMARY_AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/',
  solverAiModel: process.env.SOLVER_AI_MODEL || 'gemini-1.5-flash',
  
  criticAiApiKey: process.env.CRITIC_AI_API_KEY || process.env.SECONDARY_AI_API_KEY,
  criticAiBaseUrl: process.env.CRITIC_AI_BASE_URL || process.env.SECONDARY_AI_BASE_URL || 'https://openrouter.ai/api/v1',
  criticAiModel: process.env.CRITIC_AI_MODEL || 'anthropic/claude-3-haiku',
  
  visionAiModel: process.env.VISION_AI_MODEL || 'gpt-4o',
  multilingualAiModel: process.env.MULTILINGUAL_AI_MODEL || 'gpt-4o-mini',
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  adminSecret: process.env.ADMIN_SECRET,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  fallbackApiKeys: [
    process.env.GROQ_FALLBACK_KEY_1,
    process.env.GROQ_FALLBACK_KEY_2,
    process.env.GROQ_FALLBACK_KEY_3,
    process.env.GROQ_FALLBACK_KEY_4,
    process.env.GROQ_FALLBACK_KEY_5,
    process.env.GROQ_FALLBACK_KEY_6,
    process.env.GROQ_FALLBACK_KEY_7,
    process.env.GROQ_FALLBACK_KEY_8,
    process.env.GROQ_FALLBACK_KEY_9,
    process.env.GROQ_FALLBACK_KEY_10,
  ].filter((key): key is string => !!key), // filter out empty/undefined keys

  // Feature Flag for New AI Architecture
  useNewAiArchitecture: process.env.USE_NEW_AI_ARCHITECTURE === 'true',

  // New Per-Stage Architecture Configs
  routerProvider: process.env.ROUTER_PROVIDER || 'groq',
  routerModel: process.env.ROUTER_MODEL || 'llama-3.1-8b-instant',
  conversationProvider: process.env.CONVERSATION_PROVIDER || 'groq',
  conversationModel: process.env.CONVERSATION_MODEL || 'llama-3.1-70b-versatile',
  solverProvider: process.env.SOLVER_PROVIDER || 'openrouter',
  solverModel: process.env.SOLVER_MODEL || 'google/gemini-1.5-flash',
  criticProvider: process.env.CRITIC_PROVIDER || 'openrouter',
  criticModel: process.env.CRITIC_MODEL || 'deepseek/deepseek-chat',

  // Provider APIs
  groqApiKey: process.env.GROQ_API_KEY || process.env.PRIMARY_AI_API_KEY,
  groqBaseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || process.env.SECONDARY_AI_API_KEY,
  openrouterBaseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
};

// Startup Assertions
if (config.razorpayKeyId) {
  if (!config.razorpayKeyId.startsWith('rzp_live_') && !config.razorpayKeyId.startsWith('rzp_test_')) {
    console.warn('\x1b[33m[Warning]\x1b[0m RAZORPAY_KEY_ID should start with "rzp_live_" or "rzp_test_". Your payment integrations might fail.');
  }
  if (config.razorpayKeyId.length < 14) {
    console.warn('\x1b[33m[Warning]\x1b[0m RAZORPAY_KEY_ID seems suspiciously short. Truncated keys will fail Razorpay\'s checksum validation on every payment attempt.');
  }
} else {
  console.warn('\x1b[33m[Warning]\x1b[0m RAZORPAY_KEY_ID is not set. Razorpay features will not work.');
}

if (!config.razorpayKeySecret) {
  console.warn('\x1b[33m[Warning]\x1b[0m RAZORPAY_KEY_SECRET is not set. Razorpay features will not work.');
}
