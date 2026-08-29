import OpenAI from 'openai';
import { config } from '../config/env';
import { appCache } from '../utils/cache';
import fs from 'fs';
import path from 'path';
import { getExtractor } from '../utils/pipeline';
import { supabase } from '../lib/supabase';
import { evaluate } from 'mathjs';

const MASTER_SYSTEM_PROMPT = `You are StudyFlow AI, an elite academic study assistant. You operate using a Dual-Engine architecture (Solver and Critic). Your primary goal is to guide students to mastery through rigorous pedagogy.

### CORE PEDAGOGY: FIRST PRINCIPLES THINKING
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

export class AiService {
  private static getPrimaryClient() {
    if (!config.primaryAiApiKey) {
      throw new Error('Missing Primary AI API Key. Please configure it in .env');
    }
    return new OpenAI({
      apiKey: config.primaryAiApiKey,
      baseURL: config.primaryAiBaseUrl,
    });
  }

  private static getSecondaryClient() {
    if (!config.secondaryAiApiKey) {
      throw new Error('Missing Secondary AI API Key. Please configure it in .env');
    }
    return new OpenAI({
      apiKey: config.secondaryAiApiKey,
      baseURL: config.secondaryAiBaseUrl,
    });
  }

  private static cosineSimilarity(vecA: number[], vecB: number[]): number {
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

  private static async executeLoop(client: OpenAI, model: string, messages: any[], jsonSchema: Record<string, any>, schemaName: string, userId?: string, endpoint?: string, temperature?: number, onChunk?: (chunk: string) => void, tools?: any[], toolCallback?: (name: string, args: any) => Promise<any>) {
    let currentMessages = [...messages];

    while (true) {
      const response = await client.chat.completions.create({
        model,
        messages: currentMessages,
        ...(!(tools && tools.length > 0) ? {
          response_format: { 
            type: 'json_schema',
            json_schema: { name: schemaName, strict: true, schema: jsonSchema }
          }
        } : {
          // If tools are present, we omit response_format as Groq doesn't allow both.
          // The system prompt must instruct the model to return JSON.
        }),
        ...(tools && tools.length > 0 ? { tools } : {}),
        ...(temperature !== undefined ? { temperature } : {}),
        stream: !!onChunk && !(tools && tools.length > 0), // FIX: Bug 2
        ...(!!onChunk && !(tools && tools.length > 0) ? { stream_options: { include_usage: true } } : {}) // FIX: Bug 1
      });

      let tokensUsed = (response as any).usage?.total_tokens || 0; // FIX: Bug 1

      if (!!onChunk && !(tools && tools.length > 0)) { // FIX: Bug 2
        let content = '';
        for await (const chunk of response as any) {
          if (chunk.usage) tokensUsed = chunk.usage.total_tokens; // FIX: Bug 1
          const token = chunk.choices[0]?.delta?.content || '';
          if (token) {
            content += token;
            onChunk(token);
          }
        }
        if (userId && endpoint && tokensUsed > 0) { // FIX: Bug 1
          supabase.from('usage_log').insert([{ user_id: userId, endpoint, tokens_used: tokensUsed }]).then(({error}) => { // FIX: Bug 1
            if (error) console.error('[Usage Logger] Error:', error); // FIX: Bug 1
          }); // FIX: Bug 1
        } // FIX: Bug 1
        if (content) {
          try {
            return JSON.parse(content);
          } catch (e) {
            console.error('[AI Engine] Failed to parse JSON stream chunk:', e);
            return {};
          }
        }
        return {};
      }

      if (userId && endpoint && tokensUsed > 0) { // FIX: Bug 1
        supabase.from('usage_log').insert([{ user_id: userId, endpoint, tokens_used: tokensUsed }]).then(({error}) => { // FIX: Bug 1
          if (error) console.error('[Usage Logger] Error:', error); // FIX: Bug 1
        }); // FIX: Bug 1
      } // FIX: Bug 1

      const message = (response as any).choices[0].message;
      if (message.tool_calls && message.tool_calls.length > 0 && toolCallback) {
        currentMessages.push(message);
        for (const toolCall of message.tool_calls) {
          if (toolCall.type === 'function') {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              console.log(`[AI Engine] Tool call: ${toolCall.function.name}(${toolCall.function.arguments})`);
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
      if (onChunk && content) { // FIX: Bug 2
        onChunk(content); // FIX: Bug 2
      } // FIX: Bug 2
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
          console.error('[AI Engine] Failed to parse JSON response:', e);
          return {};
        }
      }
      return {};
    }
  }

  private static async executeWithFallback(messages: any[], jsonSchema: Record<string, any>, schemaName: string, userId?: string, endpoint?: string, temperature?: number, onChunk?: (chunk: string) => void, tools?: any[], toolCallback?: (name: string, args: any) => Promise<any>) {
    let primaryError: any = null;
    let secondaryError: any = null;

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

    if (hasImage) {
      modelToUse = config.visionAiModel;
      console.log(`[AI Engine] Vision detected. Switching to specialized model: ${modelToUse}`);
    } else if (hasMultilingual) {
      modelToUse = config.multilingualAiModel;
      console.log(`[AI Engine] Hindi/Bengali detected. Switching to specialized model: ${modelToUse}`);
    }

    try {
      const primaryClient = this.getPrimaryClient();
      console.log(`[AI Engine] Attempting generation with Primary API (${modelToUse})...`);
      return await this.executeLoop(primaryClient, modelToUse, messages, jsonSchema, schemaName, userId, endpoint, temperature, onChunk, tools, toolCallback);
    } catch (error) {
      console.warn(`[AI Engine] Primary API failed:`, error);
      primaryError = error;
    }

    try {
      const secondaryClient = this.getSecondaryClient();
      console.log(`[AI Engine] Attempting generation with Secondary API (${modelToUse})...`);
      return await this.executeLoop(secondaryClient, modelToUse, messages, jsonSchema, schemaName, userId, endpoint, temperature, onChunk, tools, toolCallback);
    } catch (error) {
      console.error(`[AI Engine] Secondary API also failed:`, error);
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
          console.log(`[AI Engine] Attempting generation with Fallback API ${i + 1} (${modelToUse})...`);
          return await this.executeLoop(fallbackClient, modelToUse, messages, jsonSchema, schemaName, userId, endpoint, temperature, onChunk, tools, toolCallback);
        } catch (error) {
          console.error(`[AI Engine] Fallback API ${i + 1} failed:`, error);
        }
      }
    }

    throw new Error(`AI Engine Exhausted all keys. Primary Error: ${primaryError?.message}. Secondary Error: ${secondaryError?.message}`);
  }

  static async retrieveContext(query: string, filter?: { subject?: string; chapter?: string }) {
    try {
      const extractor = await getExtractor();
      const output = await extractor(query, { pooling: 'mean', normalize: true });
      const query_embedding = Array.from(output.data);

      const { data, error } = await supabase.rpc('match_documents', {
        query_embedding,
        match_threshold: 0.3,
        match_count: 3,
        filter_subject: filter?.subject || null,
        filter_chapter: filter?.chapter || null
      });

      if (error) throw error;
      return data?.map((d: any) => d.content).join('\n\n') || 'No external context available.';
    } catch (err) {
      console.error('Retrieval error:', err);
      return 'No external context available.';
    }
  }

  static async retrieveContextRaw(query: string, filter?: { subject?: string; chapter?: string }) {
    try {
      const extractor = await getExtractor();
      const output = await extractor(query, { pooling: 'mean', normalize: true });
      const query_embedding = Array.from(output.data);

      const { data, error } = await supabase.rpc('match_documents', {
        query_embedding,
        match_threshold: 0.3,
        match_count: 5,
        filter_subject: filter?.subject || null,
        filter_chapter: filter?.chapter || null
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Retrieval error:', err);
      return [];
    }
  }

  static async advancedRetrieveContext(query: string, historyText: string, filter?: { subject?: string; chapter?: string }, userId?: string) {
    try {
      const expansionPrompt = `Given the user's latest question and chat history, generate 3 distinct search queries to find the most relevant information in a textbook.
1. The first query should be the core conceptual question.
2. The second query should focus on any specific formulas, equations, or laws mentioned or implied.
3. The third query should be a broader topical search or rephrase the question differently.
Return ONLY a JSON array of 3 strings.

History:
${historyText}

Latest Question: ${query}`;

      const expansionSchema = {
        type: "object",
        properties: {
          queries: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["queries"],
        additionalProperties: false
      };

      const expansionRes = await this.executeWithFallback(
        [
          { role: 'system', content: "You are an expert search query generator for a physics/math RAG pipeline." },
          { role: 'user', content: expansionPrompt }
        ],
        expansionSchema, 
        "query_expansion", 
        userId, 
        "rag_expansion", 
        0.2
      );

      const queries = expansionRes.queries && Array.isArray(expansionRes.queries) ? expansionRes.queries : [query];
      if (!queries.includes(query)) queries.push(query);

      console.log(`[AI Engine] RAG Multi-Query Expansion generated:`, queries);

      const retrievalPromises = queries.map((q: string) => this.retrieveContextRaw(q, filter));
      const resultsArray = await Promise.all(retrievalPromises);

      const rrfScores = new Map<string, { content: string, score: number }>();
      const k = 60;

      resultsArray.forEach((results) => {
        if (Array.isArray(results)) {
          results.forEach((doc: any, rank: number) => {
            if (!doc.id || !doc.content) return;
            const rrfScore = 1 / (k + rank + 1);
            if (rrfScores.has(doc.id)) {
              rrfScores.get(doc.id)!.score += rrfScore;
            } else {
              rrfScores.set(doc.id, { content: doc.content, score: rrfScore });
            }
          });
        }
      });

      const topDocs = Array.from(rrfScores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (topDocs.length === 0) return 'No external context available.';

      const rerankPrompt = `Evaluate the relevance of the following textbook excerpts to the user's question.
For each excerpt, provide a relevance score from 0 to 10. 10 is perfectly relevant to solving the question, 0 is completely irrelevant.

User Question: "${query}"

Excerpts:
${topDocs.map((doc, idx) => `[Excerpt ${idx}]\n${doc.content}\n`).join('\n')}`;

      const rerankSchema = {
        type: "object",
        properties: {
          scoredExcerpts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                excerptIndex: { type: "integer" },
                score: { type: "integer" }
              },
              required: ["excerptIndex", "score"],
              additionalProperties: false
            }
          }
        },
        required: ["scoredExcerpts"],
        additionalProperties: false
      };

      const rerankRes = await this.executeWithFallback(
        [
          { role: 'system', content: "You are a strict relevance judge for an academic RAG pipeline. Only highly relevant documents should score above 5." },
          { role: 'user', content: rerankPrompt }
        ],
        rerankSchema,
        "context_reranker",
        userId,
        "rag_rerank",
        0.0
      );

      let finalContexts: string[] = [];
      if (rerankRes.scoredExcerpts && Array.isArray(rerankRes.scoredExcerpts)) {
        const sorted = rerankRes.scoredExcerpts
          .filter((item: any) => item.score >= 5)
          .sort((a: any, b: any) => b.score - a.score);
        
        sorted.forEach((item: any) => {
          if (topDocs[item.excerptIndex]) {
            finalContexts.push(topDocs[item.excerptIndex].content);
          }
        });
      }

      if (finalContexts.length === 0) {
        console.log(`[AI Engine] RAG Re-ranker filtered out all documents or failed. Falling back to top RRF result.`);
        finalContexts = [topDocs[0].content];
      }

      console.log(`[AI Engine] Advanced RAG Pipeline completed. Yielded ${finalContexts.length} highly relevant chunks.`);
      return finalContexts.join('\n\n');

    } catch (err) {
      console.error('[AI Engine] Advanced RAG Pipeline Error:', err);
      return this.retrieveContext(query, filter);
    }
  }

  static async fetchUserMasteryContext(userId?: string): Promise<string> {
    if (!userId) return '';
    
    try {
      const { data, error } = await supabase
        .from('user_topic_mastery')
        .select('*')
        .eq('user_id', userId);
        
      if (error || !data || data.length === 0) return '';

      const struggledTopics = data.filter(t => {
        const total = t.verified_count + t.flagged_count;
        if (total === 0) return false;
        const score = t.verified_count / total;
        return score <= 0.6 || t.flagged_count > 1; // Struggling threshold
      });

      if (struggledTopics.length === 0) return '';

      const topicSummaries = struggledTopics.map(t => 
        `- ${t.topic_title} (${t.verified_count}/${t.verified_count + t.flagged_count} verified)`
      ).join('\n');

      return `\n\n=== STUDENT ADAPTIVITY PROFILE ===\nThis student has previously struggled with the following topics:\n${topicSummaries}\n\nIf the current question relates to any of these topics, you MUST explain foundational steps extremely explicitly rather than assuming mastery. Do not skip any mathematical or conceptual steps for these areas.`;
    } catch (err) {
      console.warn('[AI Engine] Failed to fetch user mastery:', err);
      return '';
    }
  }

  static async streamChat(messages: any[], systemInstruction: string, filter?: { subject?: string; chapter?: string }) { // FIX: Bug 5
    let primaryError: any = null;
    
    let processedMessages = messages;
    if (messages.length > 12) {
      const earlierMessages = messages.slice(0, -6);
      const lastSixMessages = messages.slice(-6);
      
      const earlierHistoryText = earlierMessages.map((m: any) => `${m.role}: ${m.content}`).join('\n');
      const summaryPrompt = `Summarize the following chat history concisely. Focus on the student's learning progress, concepts covered, and any persistent confusion.\n\nHistory:\n${earlierHistoryText}`;
      
      try {
        const primaryClient = this.getPrimaryClient();
        const summaryRes = await primaryClient.chat.completions.create({
          model: config.primaryAiModel,
          messages: [{ role: 'user', content: summaryPrompt }],
          max_tokens: 150,
          temperature: 0.1
        });
        const summary = summaryRes.choices[0]?.message?.content || '';
        if (summary) {
          processedMessages = [
            { role: 'system', content: `Previous Context Summary: ${summary}` },
            ...lastSixMessages
          ];
        }
      } catch (err) {
        console.warn('[AI Engine] Summarization failed, falling back to full history:', err);
      }
    }

    // Step 1: Extract the latest user query
    const latestQuery = messages[messages.length - 1]?.content || '';
    
    // Step 2: Retrieve Context
    const retrievedContext = await this.retrieveContext(latestQuery, filter); // FIX: Bug 5

    // Step 3: Run the pipeline in the background before streaming
    const pipelineSystemInstruction = `${MASTER_SYSTEM_PROMPT}

### PEDAGOGICAL APPROACH (SOCRATIC METHOD)
- Since this is a conversational follow-up, do NOT just give away the answer immediately.
- Use the Socratic method: Ask guiding questions to help the student realize the next step on their own.
- Validate their partial understanding before correcting them.
- Keep responses concise and focused on one conceptual step at a time.
- When responding, explicitly reference prior turns in the conversation naturally (e.g., "As we established earlier...", "Building on your previous answer...") if the context is relevant, instead of treating this as an isolated question.

${systemInstruction}

You are a dual-engine AI. Ensure your answer strictly aligns with the Ground Truth. If you rely on the Ground Truth, cite it.`;

    const fullSystemInstruction = pipelineSystemInstruction;

    primaryError = null;
    let secondaryError: any = null;

    let modelToUse = config.primaryAiModel;
    let hasImage = false;
    let hasMultilingual = false;

    const hindiRegex = /[\u0900-\u097F]/;
    const bengaliRegex = /[\u0980-\u09FF]/;

    for (const msg of processedMessages) {
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
      console.log(`[AI Engine] Vision detected in stream. Switching to specialized model: ${modelToUse}`);
    } else if (hasMultilingual) {
      modelToUse = config.multilingualAiModel;
      console.log(`[AI Engine] Hindi/Bengali detected in stream. Switching to specialized model: ${modelToUse}`);
    }

    try {
      const primaryClient = this.getPrimaryClient();
      console.log(`[AI Engine] Attempting stream with Primary API (${modelToUse})...`);
      const stream = await primaryClient.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: 'system', content: fullSystemInstruction },
          { role: 'system', content: `=== GROUND TRUTH ===\n${retrievedContext}\n====================` },
          ...processedMessages
        ],
        stream: true,
      });
      return stream;
    } catch (error) {
      console.warn(`[AI Engine] Primary API stream failed:`, error);
      primaryError = error;
    }

    try {
      const secondaryClient = this.getSecondaryClient();
      console.log(`[AI Engine] Attempting stream with Secondary API (${modelToUse})...`);
      const stream = await secondaryClient.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: 'system', content: fullSystemInstruction },
          { role: 'system', content: `=== GROUND TRUTH ===\n${retrievedContext}\n====================` },
          ...processedMessages
        ],
        stream: true,
      });
      return stream;
    } catch (error: any) {
      console.warn(`[AI Engine] Secondary API stream also failed:`, error);
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
          console.log(`[AI Engine] Attempting stream with Fallback API ${i + 1} (${modelToUse})...`);
          const stream = await fallbackClient.chat.completions.create({
            model: modelToUse,
            messages: [
              { role: 'system', content: fullSystemInstruction },
              { role: 'system', content: `=== GROUND TRUTH ===\n${retrievedContext}\n====================` },
              ...processedMessages
            ],
            stream: true,
          });
          return stream;
        } catch (error) {
          console.error(`[AI Engine] Fallback API ${i + 1} stream failed:`, error);
        }
      }
    }

    throw new Error(`AI Engine Stream Failure. Primary Error: ${(primaryError as any)?.message}. Secondary Error: ${secondaryError?.message}`);
  }

  static async generateSolverCritic(query: string, subject: string, language: string = 'en', messages: any[] = [], onEvent?: (event: any) => void, userId?: string) {
    const languageMap: Record<string, string> = {
      'en': 'English',
      'bn': 'Bengali (Use ONLY proper Bengali script / বাংলা লিপি for ALL text. NEVER use English/Latin letters for Bengali words. No Romanized Bengali.)',
      'hi': 'Hindi (Use ONLY proper Devanagari script / देवनागरी for ALL text. NEVER use English/Latin letters for Hindi words. No Romanized Hindi.)'
    };
    const langName = languageMap[language] || language;

    try {
      if (query.length < 1000) {
        const primaryClient = this.getPrimaryClient();
        const shortHistory = messages.slice(-4).map(m => ({ role: m.role, content: m.content }));
        
        let intent = 'ACADEMIC';
        const normalizedQuery = query.toLowerCase().trim();
        const casualGreetings = ['hello', 'hi', 'hey', 'yo', 'sup', 'what\'s up', 'whats up', 'how are you', 'good morning', 'good evening', 'good afternoon', 'write a python script', 'write a script'];
        
        if (casualGreetings.some(g => normalizedQuery.includes(g)) || (normalizedQuery.length < 20 && !/\d/.test(normalizedQuery))) {
          intent = 'CONVERSATION';
        } else {
          try {
            const intentRes = await primaryClient.chat.completions.create({
              model: config.multilingualAiModel || config.primaryAiModel, // use smarter versatile model
              messages: [
                { role: 'system', content: 'You are a strict router. Classify the user\'s message into EXACTLY one word: "ACADEMIC" or "CONVERSATION". No punctuation or explanation.\n- Output "ACADEMIC" ONLY for complex physics, math, chemistry, or rigorous science problems that require numeric calculation, mathematical derivation, formulas, or a step-by-step analytical solver.\n- Output "CONVERSATION" for everything else, including general knowledge, writing help, coding, conceptual definitions, casual reasoning, small talk, and greetings.' },
                { role: 'user', content: 'Solve 2x^2 + 5x - 3 = 0' },
                { role: 'assistant', content: 'ACADEMIC' },
                { role: 'user', content: 'Write a python script to parse JSON' },
                { role: 'assistant', content: 'CONVERSATION' },
                { role: 'user', content: 'What caused the fall of the Roman Empire?' },
                { role: 'assistant', content: 'CONVERSATION' },
                { role: 'user', content: 'Calculate the tension in the rope if mass is 5kg and a=2m/s^2' },
                { role: 'assistant', content: 'ACADEMIC' },
                { role: 'user', content: 'Hello bro' },
                { role: 'assistant', content: 'CONVERSATION' },
                { role: 'user', content: 'What is a black hole?' },
                { role: 'assistant', content: 'CONVERSATION' },
                { role: 'user', content: query }
              ],
              max_tokens: 5,
              temperature: 0.1
            });
            intent = intentRes.choices[0].message.content?.trim().toUpperCase() || 'ACADEMIC';
          } catch (e) {
            console.warn('[AI Engine] LLM Router failed, assuming ACADEMIC.', e);
          }
        }

        if (intent.includes('CONVERSATION')) {
          const chatModelToUse = (language !== 'en' || /[\u0900-\u09FF]/.test(query)) ? config.multilingualAiModel : config.primaryAiModel;
          if (onEvent) {
            const stream = await primaryClient.chat.completions.create({
              model: chatModelToUse,
              messages: [
                { role: 'system', content: `You are StudyFlow AI, an advanced and highly capable AI assistant. You confidently answer general knowledge questions, write code, explain conceptual definitions, and engage in casual conversation. Respond naturally and directly in ${langName}. You are a fully capable assistant; do not force the user to study if they ask for writing help, general information, or just want to chat.` },
                ...shortHistory,
                { role: 'user', content: query }
              ],
              stream: true
            });
            let fullText = '';
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                fullText += content;
                onEvent({ type: 'conversation_chunk', data: { content } });
              }
            }
            return { isConversation: true, content: fullText };
          } else {
            const convRes = await primaryClient.chat.completions.create({
              model: chatModelToUse,
              messages: [
                { role: 'system', content: `You are StudyFlow AI, an advanced and highly capable AI assistant. You confidently answer general knowledge questions, write code, explain conceptual definitions, and engage in casual conversation. Respond naturally and directly in ${langName}. You are a fully capable assistant; do not force the user to study if they ask for writing help, general information, or just want to chat.` },
                ...shortHistory,
                { role: 'user', content: query }
              ]
            });
            const content = convRes.choices[0].message.content || 'Hello! How can I help you with your studies today?';
            return { isConversation: true, content };
          }
        }
      }
    } catch (err) {
      console.warn('[AI Engine] Intent check failed, falling back:', err);
    }

    // The frontend sends the entire message array including the latest query. 
    // We should exclude the latest query from the history block so it isn't duplicated in the prompt.
    let historyToUse = messages;
    if (messages.length > 0 && messages[messages.length - 1].content === query) {
      historyToUse = messages.slice(0, -1);
    }

    let summarizedContext = '';
    let recentHistory = historyToUse.map(m => ({ role: m.role, content: m.content }));
    if (historyToUse.length > 12) {
      const earlierMessages = historyToUse.slice(0, -6);
      recentHistory = historyToUse.slice(-6).map(m => ({ role: m.role, content: m.content }));
      
      const earlierHistoryText = earlierMessages.map((m: any) => `${m.role}: ${m.content}`).join('\n');
      const summaryPrompt = `Summarize the following chat history concisely. Focus on the student's learning progress, concepts covered, and any persistent confusion.\n\nHistory:\n${earlierHistoryText}`;
      
      try {
        const primaryClient = this.getPrimaryClient();
        const summaryRes = await primaryClient.chat.completions.create({
          model: config.primaryAiModel,
          messages: [{ role: 'user', content: summaryPrompt }],
          max_tokens: 150,
          temperature: 0.1
        });
        summarizedContext = summaryRes.choices[0]?.message?.content || '';
      } catch (err) {
        console.warn('[AI Engine] Summarization failed, falling back to truncated history:', err);
      }
    }
    
    const historyText = recentHistory.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n');
    
    const ncertContext = await this.advancedRetrieveContext(query, historyText, { subject }, userId);

    const languageInstruction = `Respond entirely in ${langName}, including step descriptions and citation notes, but keep mathematical notation and variable names in English/standard math notation.`;
    const masteryContext = await this.fetchUserMasteryContext(userId);
    
    const systemInstruction = MASTER_SYSTEM_PROMPT + `\n\nYou are StudyFlow AI, an intelligent study assistant. Provide a step-by-step derivation without verifying your own work. ${languageInstruction}${masteryContext}\n\nWhen responding, explicitly reference prior turns in the conversation naturally (e.g., "As we established earlier...", "Building on your previous answer...") if the context is relevant, instead of treating this as an isolated question.\n\nIMPORTANT: YOU MUST OUTPUT STRICTLY VALID JSON. DO NOT WRAP YOUR RESPONSE IN MARKDOWN BLOCK QUOTES (e.g. \`\`\`json). OUTPUT ONLY THE RAW JSON OBJECT.`;

    const solverMessages: any[] = [
      { role: 'system', content: systemInstruction },
      { role: 'system', content: `=== NCERT GROUND TRUTH KNOWLEDGE BASE ===\n${ncertContext}\n=========================================\n\nCRITICAL RULE FOR HONESTY:\n- You MUST ONLY use formulas and concepts found in the Ground Truth Knowledge Base above.` }
    ];

    if (summarizedContext) {
      solverMessages.push({ role: 'system', content: `Previous Context Summary: ${summarizedContext}` });
    }

    solverMessages.push(...recentHistory);
    solverMessages.push({ role: 'user', content: `Solve the following question strictly using principles relevant to ${subject}.\n\nQuestion: "${query}"` });
    
    const solverSchema = {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              stepNumber: { type: "integer" },
              title: { type: "string" },
              description: { type: "string" },
              mathBlock: { type: ["string", "null"] }
            },
            required: ["stepNumber", "title", "description", "mathBlock"],
            additionalProperties: false
          }
        },
        finalEquation: { type: "string" },
        citation: {
          type: "object",
          properties: {
            textbook: { type: "string" },
            chapter: { type: "string" },
            notes: { type: "string" },
            ncertPage: { type: ["string", "null"] }
          },
          required: ["textbook", "chapter", "notes", "ncertPage"],
          additionalProperties: false
        },
        pipelineLog: {
          type: "object",
          properties: {
            solverDraftSummary: { type: "string" },
            ncertSourceMatch: { type: "string" }
          },
          required: ["solverDraftSummary", "ncertSourceMatch"],
          additionalProperties: false
        }
      },
      required: ["title", "summary", "steps", "finalEquation", "citation", "pipelineLog"],
      additionalProperties: false
    };

    const historyString = JSON.stringify(recentHistory);
    const cacheKey = `solverCritic_${Buffer.from(query + subject + language + historyString).toString('base64')}`;
    const cachedResponse = appCache.get<any>(cacheKey);
    if (cachedResponse) {
      console.log(`[AI Engine] Serving exact match cache for query.`);
      if (onEvent) {
        onEvent({ type: 'solver_draft', data: cachedResponse });
      }
      return cachedResponse;
    }

    // Semantic Caching
    let queryEmbedding: number[] | null = null;
    try {
      const extractor = await getExtractor();
      const output = await extractor(query, { pooling: 'mean', normalize: true });
      queryEmbedding = Array.from(output.data);
      
      const now = Date.now();
      for (const [key, item] of appCache.entries()) {
        if (key.startsWith('semanticCache_') && item.expiry > now) {
          const cachedData = item.value;
          if (cachedData.subject === subject && cachedData.language === language) {
            const similarity = this.cosineSimilarity(queryEmbedding, cachedData.embedding);
            if (similarity > 0.93) {
              console.log(`[AI Engine] Serving semantic cache match (similarity: ${(similarity * 100).toFixed(1)}%).`);
              if (onEvent) {
                onEvent({ type: 'solver_draft', data: cachedData.response });
              }
              return cachedData.response;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[AI Engine] Semantic cache check failed:', err);
    }

    const solverData = await this.executeWithFallback(solverMessages, solverSchema, 'solver_response', userId, 'solver', 0.4, (token) => {
      if (onEvent) {
        onEvent({ type: 'solver_chunk', data: { content: token } });
      }
    });
    if (onEvent) {
      onEvent({ type: 'solver_draft', data: solverData });
    }

    const criticMessages = [
      { role: 'system', content: MASTER_SYSTEM_PROMPT + `\n\nYou are the StudyFlow AI Critic Auditor. You audit physics concepts for mathematical consistency, sign errors, reference frames, and edge cases. You have NEVER seen this derivation before and must audit it skeptically step by step.\n\n${languageInstruction}\n\nIMPORTANT: YOU MUST OUTPUT STRICTLY VALID JSON. DO NOT WRAP YOUR RESPONSE IN MARKDOWN BLOCK QUOTES (e.g. \`\`\`json). OUTPUT ONLY THE RAW JSON OBJECT.` },
      { role: 'system', content: `=== NCERT GROUND TRUTH KNOWLEDGE BASE ===\n${ncertContext}\n=========================================` },
      ...recentHistory,
      { role: 'user', content: `Fact-check the following Solver AI's derivation line-by-line against standard academic curriculum and the ground truth.

Question: "${query}"

Solver Derivation:
${JSON.stringify(solverData.steps, null, 2)}

CRITICAL RULES FOR AUDIT:
1. Dimensional Analysis: Explicitly check units/dimensions of the final equation.
2. Sign Conventions: Verify vectors, coordinate systems, and work/energy signs.
3. Hallucination Traps: Check if the Solver hallucinates friction coefficients, standard gravity constants, or incorrectly assumes massless strings.
- If the question is within academic scope and conceptually correct, set criticAuditStatus = "VERIFIED" and isOutOfScope = false.
- If it contains a trick assumption, asks for out-of-scope concepts, or fails the traps above, set criticAuditStatus = "FLAGGED", isOutOfScope = true, and provide criticAuditNotes.
- Provide a confidenceScore (0-100).
- Mark unverified steps clearly with verified = false and provide criticFeedback.` }
    ];
    
    const criticSchema = {
      type: "object",
      properties: {
        criticAuditStatus: { type: "string", enum: ["VERIFIED", "FLAGGED"] },
        isOutOfScope: { type: "boolean" },
        criticAuditNotes: { type: "string" },
        confidenceScore: { type: "integer" },
        stepVerdicts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              stepNumber: { type: "integer" },
              verified: { type: "boolean" },
              criticFeedback: { type: ["string", "null"] }
            },
            required: ["stepNumber", "verified", "criticFeedback"],
            additionalProperties: false
          }
        },
        pipelineLog: {
          type: "object",
          properties: {
            criticVerificationPassed: { type: "boolean" },
            criticWarnings: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["criticVerificationPassed", "criticWarnings"],
          additionalProperties: false
        }
      },
      required: ["criticAuditStatus", "isOutOfScope", "criticAuditNotes", "confidenceScore", "stepVerdicts", "pipelineLog"],
      additionalProperties: false
    };

    const criticTools = [
      {
        type: "function",
        function: {
          name: "evaluate_expression",
          description: "Evaluate an arithmetic or algebraic expression (e.g. '15 * 42', 'sin(45 deg)'). Returns the mathematical result.",
          parameters: {
            type: "object",
            properties: {
              expression: { type: "string" }
            },
            required: ["expression"],
            additionalProperties: false
          },
          strict: true
        }
      }
    ];

    const criticToolHandler = async (name: string, args: any) => {
      if (name === "evaluate_expression") {
        try {
          // mathjs evaluate handles standard math evaluation safely
          const val = evaluate(args.expression);
          return { result: String(val) };
        } catch (e: any) {
          return { error: e.message };
        }
      }
      return { error: "Unknown tool" };
    };

    const criticData = await this.executeWithFallback(criticMessages, criticSchema, 'critic_response', userId, 'critic', 0.1, undefined, criticTools, criticToolHandler);

    const stepVerdictsMap = new Map();
    if (criticData.stepVerdicts && Array.isArray(criticData.stepVerdicts)) {
      for (const v of criticData.stepVerdicts) {
        stepVerdictsMap.set(v.stepNumber, v);
      }
    }

    let finalStatus = 'FLAGGED';
    if (criticData.criticAuditStatus === 'VERIFIED' && typeof criticData.confidenceScore === 'number' && criticData.confidenceScore >= 75) {
      finalStatus = 'VERIFIED';
    }

    let finalSolverData = solverData;
    let finalCriticData = criticData;

    // Autonomous Self-Correction Loop
    if (finalStatus === 'FLAGGED') {
      console.log(`[AI Engine] Critic flagged the response. Initiating Self-Correction Loop...`);
      const correctionMessages = [
        { role: 'system', content: MASTER_SYSTEM_PROMPT + `\n\nYou are StudyFlow AI, an intelligent study assistant. Provide a step-by-step derivation without verifying your own work. ${languageInstruction}${masteryContext}` },
        { role: 'system', content: `=== NCERT GROUND TRUTH KNOWLEDGE BASE ===\n${ncertContext}\n=========================================\n\nCRITICAL RULE FOR HONESTY:\n- You MUST ONLY use formulas and concepts found in the Ground Truth Knowledge Base above.` },
        ...recentHistory,
        { role: 'user', content: `Solve the following question strictly using principles relevant to ${subject}.\n\nQuestion: "${query}"\n\n=== CRITIC FEEDBACK FROM PREVIOUS ATTEMPT ===\nThe Critic AI rejected your previous derivation for the following reasons:\n${criticData.criticAuditNotes}\nStep-specific feedback:\n${JSON.stringify(criticData.stepVerdicts?.filter((v: any) => !v.verified) || [], null, 2)}\n\nCRITICAL INSTRUCTION: You must rewrite your derivation to address ALL of the Critic's feedback. Do not repeat the same mistakes.` }
      ];

      const correctedSolverData = await this.executeWithFallback(correctionMessages, solverSchema, 'solver_response', userId, 'solver', 0.4, (token) => {
        if (onEvent) {
          onEvent({ type: 'solver_chunk', data: { content: token, isCorrection: true } });
        }
      });
      
      if (onEvent) {
         onEvent({ type: 'solver_draft', data: correctedSolverData });
      }

      const reCriticMessages = [
        { role: 'system', content: MASTER_SYSTEM_PROMPT + `\n\nYou are the StudyFlow AI Critic Auditor. You audit physics concepts for mathematical consistency, sign errors, reference frames, and edge cases. You have NEVER seen this derivation before and must audit it skeptically step by step.\n\n${languageInstruction}` },
        { role: 'system', content: `=== NCERT GROUND TRUTH KNOWLEDGE BASE ===\n${ncertContext}\n=========================================` },
        ...recentHistory,
        { role: 'user', content: `Fact-check the following CORRECTED Solver AI's derivation line-by-line against standard academic curriculum and the ground truth.

Question: "${query}"

Corrected Solver Derivation:
${JSON.stringify(correctedSolverData.steps, null, 2)}

CRITICAL RULES FOR AUDIT:
1. Dimensional Analysis: Explicitly check units/dimensions of the final equation.
2. Sign Conventions: Verify vectors, coordinate systems, and work/energy signs.
3. Hallucination Traps: Check if the Solver hallucinates friction coefficients, standard gravity constants, or incorrectly assumes massless strings.
- If the question is within academic scope and conceptually correct, set criticAuditStatus = "VERIFIED" and isOutOfScope = false.
- If it contains a trick assumption, asks for out-of-scope concepts, or includes a common student/AI hallucination trap, set criticAuditStatus = "FLAGGED", isOutOfScope = true, and provide criticAuditNotes.
- Provide a confidenceScore (0-100).
- Mark unverified steps clearly with verified = false and provide criticFeedback.` }
      ];

      const reCriticData = await this.executeWithFallback(reCriticMessages, criticSchema, 'critic_response', userId, 'critic', 0.1, undefined, criticTools, criticToolHandler);
      
      finalSolverData = correctedSolverData;
      finalCriticData = reCriticData;
      
      if (reCriticData.criticAuditStatus === 'VERIFIED' && typeof reCriticData.confidenceScore === 'number' && reCriticData.confidenceScore >= 75) {
        finalStatus = 'VERIFIED';
      } else {
        finalStatus = 'FLAGGED';
      }
      
      // Update step mapping for the corrected data
      const reStepVerdictsMap = new Map();
      if (reCriticData.stepVerdicts && Array.isArray(reCriticData.stepVerdicts)) {
        for (const v of reCriticData.stepVerdicts) {
          reStepVerdictsMap.set(v.stepNumber, v);
        }
      }

      if (finalSolverData.steps && Array.isArray(finalSolverData.steps)) {
        finalSolverData.steps = finalSolverData.steps.map((step: any) => {
          const verdict = reStepVerdictsMap.get(step.stepNumber) || { verified: true, criticFeedback: '' };
          return {
            ...step,
            verified: verdict.verified,
            criticFeedback: verdict.criticFeedback
          };
        });
      }
    } else {
      if (finalSolverData.steps && Array.isArray(finalSolverData.steps)) {
        finalSolverData.steps = finalSolverData.steps.map((step: any) => {
          const verdict = stepVerdictsMap.get(step.stepNumber) || { verified: true, criticFeedback: '' };
          return {
            ...step,
            verified: verdict.verified,
            criticFeedback: verdict.criticFeedback
          };
        });
      }
    }

    const finalResponse = {
      ...finalSolverData,
      criticAuditStatus: finalStatus,
      isOutOfScope: finalCriticData.isOutOfScope,
      criticAuditNotes: finalCriticData.criticAuditNotes,
      confidenceScore: finalCriticData.confidenceScore,
      stepVerdicts: finalCriticData.stepVerdicts,
      pipelineLog: {
        ...(finalSolverData.pipelineLog || {}),
        ...(finalCriticData.pipelineLog || {})
      }
    };

    appCache.set(cacheKey, finalResponse, 3600 * 24);
    
    if (queryEmbedding) {
      let semanticCount = 0; // FIX: Bug 3
      let oldestKey = ''; // FIX: Bug 3
      let oldestTime = Infinity; // FIX: Bug 3
      for (const [key] of appCache.entries()) { // FIX: Bug 3
        if (key.startsWith('semanticCache_')) { // FIX: Bug 3
          semanticCount++; // FIX: Bug 3
          const parts = key.split('_'); // FIX: Bug 3
          const time = parseInt(parts[1] || '0', 10); // FIX: Bug 3
          if (time < oldestTime) { // FIX: Bug 3
            oldestTime = time; // FIX: Bug 3
            oldestKey = key; // FIX: Bug 3
          } // FIX: Bug 3
        } // FIX: Bug 3
      } // FIX: Bug 3
      if (semanticCount >= 500 && oldestKey) { // FIX: Bug 3
        appCache.delete(oldestKey); // FIX: Bug 3
      } // FIX: Bug 3

      const semanticKey = `semanticCache_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      appCache.set(semanticKey, {
        subject,
        language,
        embedding: queryEmbedding,
        response: finalResponse
      }, 3600 * 24);
    }

    return finalResponse;
  }

  static async generateTopicAudit(topicTitle: string, subtitle: string, unit: string, userId?: string) {
    const schemaDescription = {
      type: "object",
      properties: {
        status: { type: "string" },
        auditDetails: { type: "string" },
        insights: {
          type: "array",
          items: { type: "string" }
        },
        recommendedMasteryScore: { type: "integer" }
      },
      required: ["status", "auditDetails", "insights", "recommendedMasteryScore"],
      additionalProperties: false
    };

    const cacheKey = `topicAudit_${Buffer.from(topicTitle + subtitle + unit).toString('base64')}`;
    const cachedResponse = appCache.get<any>(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    const auditMessages = [
      { role: 'system', content: MASTER_SYSTEM_PROMPT + `\n\nYou are StudyFlow AI Critic Auditor. You audit physics concepts for mathematical consistency, sign errors, reference frames, and edge cases.` },
      { role: 'user', content: `Perform a Critic Audit on the academic topic "${topicTitle}" (${subtitle}) in unit "${unit}". Evaluate mathematical consistency, sign conventions, and common student pitfalls.` }
    ];

    const response = await this.executeWithFallback(auditMessages, schemaDescription, 'topic_audit_response', userId, 'audit');
    appCache.set(cacheKey, response, 3600 * 24); // Cache for 24 hours
    return response;
  }

  static async performVisionOCR(buffer: Buffer, mimetype: string): Promise<string> {
    try {
      const base64Image = buffer.toString('base64');
      const dataUrl = `data:${mimetype};base64,${base64Image}`;
      
      const primaryClient = this.getPrimaryClient();
      const response = await primaryClient.chat.completions.create({
        model: config.visionAiModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert OCR system. Transcribe the handwritten or printed text from the image accurately. Preserve all mathematical notation using LaTeX format ($...$ for inline, $$...$$ for block). Return ONLY the transcribed text without any extra conversational text or markdown blocks.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Please transcribe this image.' },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      });

      return response.choices[0]?.message?.content?.trim() || '';
    } catch (err) {
      console.error('[AI Engine] Vision OCR Error:', err);
      throw err;
    }
  }

  static async transcribeAudio(filePath: string): Promise<string> {
    try {
      const primaryClient = this.getPrimaryClient();
      const transcription = await primaryClient.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: 'whisper-large-v3', 
        response_format: 'text',
      });
      // Handle different return types (text directly or object)
      return typeof transcription === 'string' ? transcription : (transcription as any).text || '';
    } catch (err) {
      console.error('[AI Engine] Transcription Error:', err);
      throw err;
    }
  }
}
