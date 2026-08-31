import { AiClient, MASTER_SYSTEM_PROMPT } from './ai/client';
import { AiContext } from './ai/context';
import { AiSolverCritic } from './ai/solver-critic';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { appCache } from '../utils/cache';
import fs from 'fs';
import path from 'path';

export class AiService {
  // Client methods
  static getPrimaryClient = AiClient.getPrimaryClient;
  static getSecondaryClient = AiClient.getSecondaryClient;
  static getClientForProvider = AiClient.getClientForProvider;
  static sleep = AiClient.sleep;
  static cosineSimilarity = AiClient.cosineSimilarity;
  static executeLoop = AiClient.executeLoop;
  static executeWithFallback = AiClient.executeWithFallback;
  static executeStreamWithFallback = AiClient.executeStreamWithFallback;

  // Context methods
  static retrieveContext = AiContext.retrieveContext;
  static retrieveContextRaw = AiContext.retrieveContextRaw;
  static advancedRetrieveContext = AiContext.advancedRetrieveContext;
  static fetchUserMasteryContext = AiContext.fetchUserMasteryContext;
  static retrieveUserMemory = AiContext.retrieveUserMemory;

  // Solver-Critic
  static generateSolverCritic = AiSolverCritic.generateSolverCritic;

  // Remaining methods kept inline
  static async streamChat(messages: any[], systemInstruction: string, filter?: { subject?: string; chapter?: string }, userId?: string, token?: string) {
    let primaryError: any = null;
    
    let processedMessages = messages;
    if (messages.length > 12) {
      const earlierMessages = messages.slice(0, -6);
      const lastSixMessages = messages.slice(-6);
      
      const earlierHistoryText = earlierMessages.map((m: any) => `${m.role}: ${m.content}`).join('\n');
      const summaryPrompt = `Summarize the following chat history concisely. Focus on the student's learning progress, concepts covered, and any persistent confusion.\n\nHistory:\n${earlierHistoryText}`;
      
      try {
        const client = config.useNewAiArchitecture ? AiClient.getClientForProvider(config.routerProvider) : AiClient.getPrimaryClient();
        const routerModel = config.useNewAiArchitecture ? config.routerModel : config.primaryAiModel;
        const summaryRes = await client.chat.completions.create({
          model: routerModel,
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
        logger.warn('[AI Engine] Summarization failed, falling back to full history:', err);
      }
    }

    const latestQuery = messages[messages.length - 1]?.content || '';
    const retrievedContext = await AiContext.retrieveContext(latestQuery, filter);

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

    const streamMessages = [
      { role: 'system', content: fullSystemInstruction },
      { role: 'system', content: `=== GROUND TRUTH ===\n${retrievedContext}\n====================` },
      ...processedMessages
    ];

    return await AiClient.executeStreamWithFallback(streamMessages, 'chat', userId, token);
  }

  static async generateTopicAudit(topicTitle: string, subtitle: string, unit: string, userId?: string, token?: string) {
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

    const response = await AiClient.executeWithFallback(auditMessages, schemaDescription, 'topic_audit_response', userId, 'audit');
    appCache.set(cacheKey, response, 3600 * 24);
    return response;
  }

  static async performVisionOCR(buffer: Buffer, mimetype: string): Promise<string> {
    try {
      const base64Image = buffer.toString('base64');
      const dataUrl = `data:${mimetype};base64,${base64Image}`;
      
      const primaryClient = AiClient.getPrimaryClient();
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
      logger.error('[AI Engine] Vision OCR Error:', err);
      throw err;
    }
  }

  static async transcribeAudio(filePath: string): Promise<string> {
    try {
      const primaryClient = AiClient.getPrimaryClient();
      const transcription = await primaryClient.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: 'whisper-large-v3', 
        response_format: 'text',
      });
      return typeof transcription === 'string' ? transcription : (transcription as any).text || '';
    } catch (err) {
      logger.error('[AI Engine] Transcription Error:', err);
      throw err;
    }
  }
}
