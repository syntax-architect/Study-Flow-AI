import OpenAI from 'openai';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { supabase, getAuthSupabase } from '../../lib/supabase';

export const MASTER_SYSTEM_PROMPT = `You are StudyFlow AI, an elite academic study assistant. You operate using a Dual-Engine architecture (Solver and Critic). Your primary goal is to guide students to mastery through rigorous pedagogy.

### CORE PEDAGOGY: SOCRATIC METHOD & FIRST PRINCIPLES
- **Socratic Mode by Default**: Do NOT provide the complete solution upfront unless explicitly requested. Analyze the user's input, identify the missing conceptual link, and ask a guiding question to lead them to the next step.
- Never skip algebraic steps or assume the student "just knows" a formula.
- Never skip algebraic steps or assume the student "just knows" a formula.
- Always begin by identifying the fundamental physical laws or mathematical axioms involved.
- Define all variables, state coordinate systems/sign conventions, and outline assumptions explicitly before substituting numbers.
- Your derivations must be logically flawless and pedagogically structured.

### MATHEMATICAL FORMATTING RULES
- Use $...$ for inline math and $$...$$ for block math.
- Do NOT use \\( ... \\) or \\[ ... \\].
- Block math ($$) MUST start and end on their own separate lines.
- For multi-line equations, wrap them in \\begin{aligned} ... \\end{aligned} inside the $$ block. Do not output \\end{aligned} without a matching \\begin.
- Variables and mathematical notation must always remain in English/standard notation, even if the surrounding text is translated.

### CRITICAL INSTRUCTION
- You must STRICTLY adhere to the Ground Truth Context provided. Do not hallucinate constants or formulas not supported by standard curriculum.`;

export class AiClient {
  static getPrimaryClient() {
    if (!config.primaryAiApiKey) {
      throw new Error('Missing Primary AI API Key. Please configure it in .env');
    }
    return new OpenAI({
      apiKey: config.primaryAiApiKey,
      baseURL: config.primaryAiBaseUrl,
      dangerouslyAllowBrowser: true,
    });
  }

  static getSecondaryClient() {
    if (!config.secondaryAiApiKey) {
      throw new Error('Missing Secondary AI API Key. Please configure it in .env');
    }
    return new OpenAI({
      apiKey: config.secondaryAiApiKey,
      baseURL: config.secondaryAiBaseUrl,
      dangerouslyAllowBrowser: true,
    });
  }

  static getClientForProvider(provider: string) {
    if (provider.toLowerCase() === 'groq') {
      if (!config.groqApiKey) throw new Error('Missing GROQ_API_KEY');
      return new OpenAI({ apiKey: config.groqApiKey, baseURL: config.groqBaseUrl, dangerouslyAllowBrowser: true });
    } else if (provider.toLowerCase() === 'openrouter') {
      if (!config.openrouterApiKey) throw new Error('Missing OPENROUTER_API_KEY');
      return new OpenAI({ apiKey: config.openrouterApiKey, baseURL: config.openrouterBaseUrl, dangerouslyAllowBrowser: true });
    } else {
      if (!config.primaryAiApiKey) throw new Error(`Missing API key for provider ${provider}`);
      return new OpenAI({ apiKey: config.primaryAiApiKey, baseURL: config.primaryAiBaseUrl, dangerouslyAllowBrowser: true });
    }
  }

  static async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  static async executeLoop(client: OpenAI, model: string, messages: any[], jsonSchema: Record<string, any>, schemaName: string, userId?: string, endpoint?: string, temperature?: number, onChunk?: (chunk: string) => void, tools?: any[], toolCallback?: (name: string, args: any) => Promise<any>, token?: string) {
    let currentMessages = [...messages];

    // INJECT SCHEMA INTO SYSTEM PROMPT FOR OPEN-SOURCE MODELS
    if (jsonSchema && Object.keys(jsonSchema).length > 0) {
      if (currentMessages.length > 0 && currentMessages[0].role === 'system') {
        currentMessages[0] = {
          ...currentMessages[0],
          content: currentMessages[0].content + `\n\nCRITICAL INSTRUCTION: You MUST return a JSON object that STRICTLY matches the following schema. Ensure ALL required properties are present. DO NOT wrap your output in \`\`\`json or any other markdown. Return raw JSON only:\n${JSON.stringify(jsonSchema, null, 2)}`
        };
      }
    }

    while (true) {
      const response = await client.chat.completions.create({
        model,
        messages: currentMessages,
        ...(!(tools && tools.length > 0) ? {
          // Omit response_format entirely to bypass Groq's strict server-side JSON validation
          // We extract JSON from markdown manually in cleanContent below.
        } : {
          // If tools are present, we omit response_format
        }),
        ...(tools && tools.length > 0 ? { tools } : {}),
        ...(temperature !== undefined ? { temperature } : {}),
        stream: !!onChunk && !(tools && tools.length > 0),
        ...(!!onChunk && !(tools && tools.length > 0) ? { stream_options: { include_usage: true } } : {})
      });

      let tokensUsed = (response as any).usage?.total_tokens || 0;

      if (!!onChunk && !(tools && tools.length > 0)) {
        let content = '';
        for await (const chunk of response as any) {
          if (chunk.usage) tokensUsed = chunk.usage.total_tokens;
          const token = chunk.choices[0]?.delta?.content || '';
          if (token) {
            content += token;
            onChunk(token);
          }
        }
        if (userId && endpoint && tokensUsed > 0) {
          const _client = token ? getAuthSupabase(token) : supabase;
          _client.from('usage_log').insert([{ user_id: userId, endpoint, tokens_used: tokensUsed }]).then(({error}) => {
            if (error) logger.error('[Usage Logger] Error:', error);
          });
        }
        if (content) {
          try {
            return JSON.parse(content);
          } catch (e) {
            logger.error('[AI Engine] Failed to parse JSON stream chunk:', e);
            return {};
          }
        }
        return {};
      }

      if (userId && endpoint && tokensUsed > 0) {
        const _client = token ? getAuthSupabase(token) : supabase;
        _client.from('usage_log').insert([{ user_id: userId, endpoint, tokens_used: tokensUsed }]).then(({error}) => {
          if (error) logger.error('[Usage Logger] Error:', error);
        });
      }

      const message = (response as any).choices[0].message;
      if (message.tool_calls && message.tool_calls.length > 0 && toolCallback) {
        currentMessages.push(message);
        for (const toolCall of message.tool_calls) {
          if (toolCall.type === 'function') {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              logger.info(`[AI Engine] Tool call: ${toolCall.function.name}(${toolCall.function.arguments})`);
              const result = await toolCallback(toolCall.function.name, args);
              currentMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
              });
            } catch (e: any) {
              currentMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: String(e.message) })
              });
            }
          }
        }
        continue;
      }

      const content = message.content || '';
      if (onChunk && content) {
        onChunk(content);
      }
      let cleanContent = content;
      if (cleanContent) {
        const match = cleanContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          cleanContent = match[1];
        }
        cleanContent = cleanContent.trim();
      }
      if (cleanContent) {
        try {
          return JSON.parse(cleanContent);
        } catch (e) {
          logger.error('[AI Engine] Failed to parse JSON response:', e);
          return {};
        }
      }
      return {};
    }
  }

  static async executeWithFallback(messages: any[], jsonSchema: Record<string, any>, schemaName: string, userId?: string, endpoint?: string, temperature?: number, onChunk?: (chunk: string) => void, tools?: any[], toolCallback?: (name: string, args: any) => Promise<any>, token?: string) {
    if (config.useNewAiArchitecture) {
      let provider = config.routerProvider;
      let model = config.routerModel;

      if (endpoint === 'solver') {
        provider = config.solverProvider;
        model = config.solverModel;
      } else if (endpoint === 'critic') {
        provider = config.criticProvider;
        model = config.criticModel;
      } else if (endpoint === 'audit') {
        provider = config.solverProvider;
        model = config.solverModel;
      }

      let hasImage = false;
      let hasMultilingual = false;

      const hindiRegex = /[\u0900-\u097F]/;
      const bengaliRegex = /[\u0980-\u09FF]/;

      for (const msg of messages) {
        if (typeof msg.content === 'string') {
          if (hindiRegex.test(msg.content) || bengaliRegex.test(msg.content)) {
            hasMultilingual = true;
          }
        } else if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'image_url') {
              hasImage = true;
            }
            if (part.type === 'text' && (hindiRegex.test(part.text) || bengaliRegex.test(part.text))) {
              hasMultilingual = true;
            }
          }
        }
      }

      if (hasImage) {
        model = config.visionAiModel;
      } else if (hasMultilingual && endpoint !== 'critic' && endpoint !== 'solver') {
        model = config.multilingualAiModel;
      }

      const client = this.getClientForProvider(provider);
      const maxRetries = 3;
      let attempt = 0;

      while (attempt < maxRetries) {
        try {
          logger.info(`[AI Engine] Attempt ${attempt + 1}/${maxRetries} with ${provider} (${model}) for ${endpoint || 'default'}...`);
          return await this.executeLoop(client, model, messages, jsonSchema, schemaName, userId, endpoint, temperature, onChunk, tools, toolCallback, token);
        } catch (error: any) {
          logger.warn(`[AI Engine] ${provider} attempt ${attempt + 1} failed:`, error.message);
          attempt++;
          if (attempt >= maxRetries) break;
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
        }
      }

      const fallbackProvider = provider.toLowerCase() === 'openrouter' ? 'groq' : 'openrouter';
      const fallbackModel = fallbackProvider === 'groq' ? 'qwen/qwen3.6-27b' : 'google/gemini-2.0-flash-001';
      logger.warn(`[AI Engine] Falling back to secondary provider ${fallbackProvider} (${fallbackModel}) for ${endpoint || 'default'}...`);
      const fallbackClient = this.getClientForProvider(fallbackProvider);

      try {
        return await this.executeLoop(fallbackClient, fallbackModel, messages, jsonSchema, schemaName, userId, endpoint, temperature, onChunk, tools, toolCallback, token);
      } catch (error: any) {
        throw new Error(`AI Engine Exhausted all retries. Final Fallback Error: ${error.message}`);
      }
    }

    let primaryError: any = null;
    let secondaryError: any = null;

    let modelToUse = config.primaryAiModel;
    let primaryApiKey = config.primaryAiApiKey;
    let primaryBaseUrl = config.primaryAiBaseUrl;
    let secondaryApiKey = config.secondaryAiApiKey;
    let secondaryBaseUrl = config.secondaryAiBaseUrl;

    if (endpoint === 'critic') {
      modelToUse = config.criticAiModel;
      primaryApiKey = config.criticAiApiKey;
      primaryBaseUrl = config.criticAiBaseUrl;
      secondaryApiKey = config.criticAiApiKey;
      secondaryBaseUrl = config.criticAiBaseUrl;
    } else if (endpoint === 'solver') {
      modelToUse = config.solverAiModel;
      primaryApiKey = config.solverAiApiKey;
      primaryBaseUrl = config.solverAiBaseUrl;
      secondaryApiKey = config.solverAiApiKey;
      secondaryBaseUrl = config.solverAiBaseUrl;
    }

    let hasImage = false;
    let hasMultilingual = false;

    const hindiRegex = /[\u0900-\u097F]/;
    const bengaliRegex = /[\u0980-\u09FF]/;

    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        if (hindiRegex.test(msg.content) || bengaliRegex.test(msg.content)) {
          hasMultilingual = true;
        }
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'image_url') {
            hasImage = true;
          }
          if (part.type === 'text' && (hindiRegex.test(part.text) || bengaliRegex.test(part.text))) {
            hasMultilingual = true;
          }
        }
      }
    }

    if (hasImage) {
      modelToUse = config.visionAiModel;
      logger.info(`[AI Engine] Vision detected. Switching to specialized model: ${modelToUse}`);
    } else if (hasMultilingual && endpoint !== 'critic' && endpoint !== 'solver') {
      // Don't override specialized solver/critic models for language routing
      modelToUse = config.multilingualAiModel;
      logger.info(`[AI Engine] Hindi/Bengali detected. Switching to specialized model: ${modelToUse}`);
    }

    try {
      if (!primaryApiKey) throw new Error(`Missing primary API key for endpoint: ${endpoint}`);
      const primaryClient = new OpenAI({ apiKey: primaryApiKey, baseURL: primaryBaseUrl });
      logger.info(`[AI Engine] Attempting generation with Primary API (${modelToUse}) for ${endpoint || 'default'}...`);
      return await this.executeLoop(primaryClient, modelToUse, messages, jsonSchema, schemaName, userId, endpoint, temperature, onChunk, tools, toolCallback, token);
    } catch (error) {
      logger.warn(`[AI Engine] Primary API failed:`, error);
      primaryError = error;
    }

    try {
      if (!secondaryApiKey) throw new Error(`Missing secondary API key for endpoint: ${endpoint}`);
      const secondaryClient = new OpenAI({ apiKey: secondaryApiKey, baseURL: secondaryBaseUrl });
      logger.info(`[AI Engine] Attempting generation with Secondary API (${modelToUse}) for ${endpoint || 'default'}...`);
      return await this.executeLoop(secondaryClient, modelToUse, messages, jsonSchema, schemaName, userId, endpoint, temperature, onChunk, tools, toolCallback, token);
    } catch (error) {
      logger.error(`[AI Engine] Secondary API also failed:`, error);
      secondaryError = error;
    }

    const fallbackErrors: any[] = [];
    if (config.fallbackApiKeys && config.fallbackApiKeys.length > 0) {
      for (let i = 0; i < config.fallbackApiKeys.length; i++) {
        try {
          const fallbackKey = config.fallbackApiKeys[i];
          const fallbackClient = new OpenAI({
            apiKey: fallbackKey,
            baseURL: config.secondaryAiBaseUrl,
          });
          const groqModelToUse = "qwen/qwen3.6-27b";
          logger.info(`[AI Engine] Attempting generation with Fallback API ${i + 1} (${groqModelToUse})...`);
          return await this.executeLoop(fallbackClient, groqModelToUse, messages, jsonSchema, schemaName, userId, endpoint, temperature, onChunk, tools, toolCallback, token);
        } catch (error) {
          logger.error(`[AI Engine] Fallback API ${i + 1} failed:`, error);
          fallbackErrors.push(error);
        }
      }
    }

    const fallbackErrorMsg = fallbackErrors.map((e, idx) => `[FB${idx+1}] ${e?.message}`).join(', ');
    throw new Error(`AI Engine Failure: Exhausted all keys. Primary Error: ${primaryError?.message}. Secondary Error: ${secondaryError?.message}. Fallback Errors: ${fallbackErrorMsg}`);
  }

  static async executeStreamWithFallback(messages: any[], endpoint?: string, userId?: string, token?: string) {
    let modelToUse = config.primaryAiModel;
    let hasImage = false;
    let hasMultilingual = false;

    const hindiRegex = /[\u0900-\u097F]/;
    const bengaliRegex = /[\u0980-\u09FF]/;

    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        if (hindiRegex.test(msg.content) || bengaliRegex.test(msg.content)) {
          hasMultilingual = true;
        }
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'image_url') {
            hasImage = true;
          }
          if (part.type === 'text' && (hindiRegex.test(part.text) || bengaliRegex.test(part.text))) {
            hasMultilingual = true;
          }
        }
      }
    }

    if (config.useNewAiArchitecture) {
      let provider = config.conversationProvider;
      modelToUse = config.conversationModel;

      if (hasImage) {
        modelToUse = config.visionAiModel;
      } else if (hasMultilingual) {
        modelToUse = config.multilingualAiModel;
      }

      const client = this.getClientForProvider(provider);
      const maxRetries = 3;
      let attempt = 0;

      while (attempt < maxRetries) {
        try {
          logger.info(`[AI Engine] Attempt ${attempt + 1}/${maxRetries} stream with ${provider} (${modelToUse}) for ${endpoint || 'conversation'}...`);
          const stream = await client.chat.completions.create({
            model: modelToUse,
            messages,
            stream: true,
          });
          return stream;
        } catch (error: any) {
          logger.warn(`[AI Engine] ${provider} stream attempt ${attempt + 1} failed:`, error.message);
          attempt++;
          if (attempt >= maxRetries) break;
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
        }
      }

      const fallbackProvider = provider.toLowerCase() === 'openrouter' ? 'groq' : 'openrouter';
      const fallbackModel = fallbackProvider === 'groq' ? 'qwen/qwen3.6-27b' : 'google/gemini-2.0-flash-001';
      logger.warn(`[AI Engine] Falling back stream to secondary provider ${fallbackProvider} (${fallbackModel}) for ${endpoint || 'conversation'}...`);
      const fallbackClient = this.getClientForProvider(fallbackProvider);

      try {
        return await fallbackClient.chat.completions.create({
          model: fallbackModel,
          messages,
          stream: true,
        });
      } catch (error: any) {
        throw new Error(`AI Engine Stream Exhausted all retries. Final Fallback Error: ${error.message}`);
      }
    }

    // Legacy mode
    if (hasImage) {
      modelToUse = config.visionAiModel;
    } else if (hasMultilingual) {
      modelToUse = config.multilingualAiModel;
    }

    let primaryError: any = null;
    let secondaryError: any = null;

    try {
      const primaryClient = this.getPrimaryClient();
      logger.info(`[AI Engine] Attempting stream with Primary API (${modelToUse})...`);
      const stream = await primaryClient.chat.completions.create({
        model: modelToUse,
        messages,
        stream: true,
      });
      return stream;
    } catch (error) {
      logger.warn(`[AI Engine] Primary API stream failed:`, error);
      primaryError = error;
    }

    try {
      const secondaryClient = this.getSecondaryClient();
      logger.info(`[AI Engine] Attempting stream with Secondary API (${modelToUse})...`);
      const stream = await secondaryClient.chat.completions.create({
        model: modelToUse,
        messages,
        stream: true,
      });
      return stream;
    } catch (error: any) {
      logger.warn(`[AI Engine] Secondary API stream also failed:`, error);
      secondaryError = error;
    }

    if (config.fallbackApiKeys && config.fallbackApiKeys.length > 0) {
      for (let i = 0; i < config.fallbackApiKeys.length; i++) {
        try {
          const fallbackKey = config.fallbackApiKeys[i];
          const fallbackClient = new OpenAI({
            apiKey: fallbackKey,
            baseURL: config.secondaryAiBaseUrl,
          });
          const groqModelToUseStream = "qwen/qwen3.6-27b";
          logger.info(`[AI Engine] Attempting stream with Fallback API ${i + 1} (${groqModelToUseStream})...`);
          const stream = await fallbackClient.chat.completions.create({
            model: modelToUse,
            messages,
            stream: true,
          });
          return stream;
        } catch (error) {
          logger.error(`[AI Engine] Fallback API ${i + 1} stream failed:`, error);
        }
      }
    }

    throw new Error(`AI Engine Stream Failure. Primary Error: ${(primaryError as any)?.message}. Secondary Error: ${secondaryError?.message}`);
  }
}
