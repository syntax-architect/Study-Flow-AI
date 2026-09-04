import { logger } from '../utils/logger';
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AiService } from '../services/ai.service';
import { BhashiniService } from '../services/bhashini.service';
import { supabase, getAuthSupabase } from '../lib/supabase';
import { appCache } from '../utils/cache';
import crypto from 'crypto';

const getClient = (req: Request) => {
  const tokenHeader = req.headers.authorization?.split(' ')[1];
  return getAuthSupabase(tokenHeader);
};

export const handleSolverCritic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, subject = 'Software Engineering', chatId, userId, language = 'en', messages = [], imageUrl } = req.body;

    if (!query && !imageUrl) {
      return res.status(400).json({ error: 'Query or image is required' });
    }

    const token = req.headers.authorization?.split(' ')[1];
    const isStream = req.query.stream === 'true' || req.headers.accept === 'text/event-stream';

    // Prevent LLM from imitating our internal JSON response structure
    const sanitizedMessages = messages.map((m: any) => {
      if (!m) return m;
      if (m.role === 'assistant' && typeof m.content === 'string') {
        try {
          const parsed = JSON.parse(m.content);
          return { ...m, content: parsed.content || m.content };
        } catch (e) {
          return m;
        }
      } else if (m.role === 'assistant' && m.content && typeof m.content === 'object') {
        return { ...m, content: m.content.content || JSON.stringify(m.content) };
      }
      return m;
    });

    let finalResponse: any;

    if (isStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const onEvent = (eventData: any) => {
        if (eventData.type === 'solver_draft') {
          const partialResponse = {
            id: 'sol-' + Date.now(),
            query,
            subject,
            ...eventData.data,
            timestamp: new Date().toISOString(),
          };
          res.write(`event: solver_draft\ndata: ${JSON.stringify(partialResponse)}\n\n`);
        } else if (eventData.type === 'solver_chunk') {
          res.write(`event: solver_chunk\ndata: ${JSON.stringify(eventData.data)}\n\n`);
        } else if (eventData.type === 'critic_chunk') {
          res.write(`event: critic_chunk\ndata: ${JSON.stringify(eventData.data)}\n\n`);
        } else if (eventData.type === 'conversation_chunk') {
          res.write(`event: conversation_chunk\ndata: ${JSON.stringify(eventData.data)}\n\n`);
        }
      };

      const resultData = await AiService.generateSolverCritic(query, subject, language, sanitizedMessages, onEvent, userId, token, imageUrl);

      finalResponse = {
        id: 'sol-' + Date.now(),
        query,
        subject,
        ...resultData,
        timestamp: new Date().toISOString(),
      };

      // Save user message to DB
      if (chatId && finalResponse) {
        logger.debug(`[AI Controller] Saving user message to chat ${chatId}`);
        const { error: userErr } = await getClient(req).from('messages').insert([{
          chat_id: chatId,
          role: 'user',
          content: query
        }]);
        if (userErr) {
          logger.error("[AI Controller] Error saving user message:", userErr);
        } else {
          logger.debug("[AI Controller] User message saved successfully.");
        }
      }

      // Save assistant message to DB (stringified JSON)
      if (chatId && finalResponse) {
        logger.debug(`[AI Controller] Saving assistant message to chat ${chatId}`);
        const { error: astErr } = await getClient(req).from('messages').insert([{
          chat_id: chatId,
          role: 'assistant',
          content: JSON.stringify(finalResponse)
        }]);
        if (astErr) {
          logger.error("[AI Controller] Error saving assistant message:", astErr);
        } else {
          logger.debug("[AI Controller] Assistant message saved successfully.");
        }
      }

      // Upsert mastery
      if (userId && finalResponse && !finalResponse.isConversation) {
        const topicTitle = finalResponse.citation?.chapter || 'Unknown Topic';
        const topicId = topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const isVerified = finalResponse.criticAuditStatus === 'VERIFIED';
        const { error: masteryErr } = await getClient(req).rpc('upsert_topic_mastery', {
          p_user_id: userId,
          p_topic_id: topicId,
          p_topic_title: topicTitle,
          p_is_verified: isVerified
        });
        if (masteryErr) logger.error("Error upserting mastery:", masteryErr);
      }

      res.write(`event: critic_verdict\ndata: ${JSON.stringify(finalResponse)}\n\n`);
      res.end();
    } else {
      const resultData = await AiService.generateSolverCritic(query, subject, language, sanitizedMessages, undefined, userId, token, imageUrl);

      finalResponse = {
        id: 'sol-' + Date.now(),
        query,
        subject,
        ...resultData,
        timestamp: new Date().toISOString(),
      };

      // Save user message to DB
      if (chatId && finalResponse) {
        logger.debug(`[AI Controller] Saving user message to chat ${chatId} (non-stream)`);
        const { error: userErr } = await getClient(req).from('messages').insert([{
          chat_id: chatId,
          role: 'user',
          content: query
        }]);
        if (userErr) {
          logger.error("[AI Controller] Error saving user message:", userErr);
        } else {
          logger.debug("[AI Controller] User message saved successfully.");
        }
      }

      // Save assistant message to DB (stringified JSON)
      if (chatId && finalResponse) {
        logger.debug(`[AI Controller] Saving assistant message to chat ${chatId} (non-stream)`);
        const { error: astErr } = await getClient(req).from('messages').insert([{
          chat_id: chatId,
          role: 'assistant',
          content: JSON.stringify(finalResponse)
        }]);
        if (astErr) {
          logger.error("[AI Controller] Error saving assistant message:", astErr);
        } else {
          logger.debug("[AI Controller] Assistant message saved successfully.");
        }
      }

      // Upsert mastery
      if (userId && finalResponse && !finalResponse.isConversation) {
        const topicTitle = finalResponse.citation?.chapter || 'Unknown Topic';
        const topicId = topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const isVerified = finalResponse.criticAuditStatus === 'VERIFIED';
        const { error: masteryErr } = await getClient(req).rpc('upsert_topic_mastery', {
          p_user_id: userId,
          p_topic_id: topicId,
          p_topic_title: topicTitle,
          p_is_verified: isVerified
        });
        if (masteryErr) logger.error("Error upserting mastery:", masteryErr);
      }

      res.json(finalResponse);
    }

  } catch (err: any) {
    if (res.headersSent) {
      if (!res.writableEnded) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: err.message || 'Stream error' })}\n\n`);
        res.end();
      } else {
        logger.error('Error after stream ended:', err);
      }
    } else {
      next(err);
    }
  }
};

export const handleAuditTopic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { topicTitle, subtitle, unit } = req.body;

    if (!topicTitle || !unit) {
      return res.status(400).json({ error: 'topicTitle and unit are required' });
    }

    const token = req.headers.authorization?.split(' ')[1];
    const resultData = await AiService.generateTopicAudit(topicTitle, subtitle || '', unit, req.body.userId, token);
    res.json(resultData);
  } catch (err) {
    next(err);
  }
};

export const handleChatStream = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messages, chatId, subject } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array cannot be empty' });
    }

    const systemInstruction = "You are StudyFlow AI, an intelligent and helpful academic study assistant. Provide clear, step-by-step explanations for the user's queries across various subjects.";

    let originalUserContent = '';
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'user') {
        originalUserContent = lastMsg.content;
      }
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const messagesHash = crypto.createHash('sha256').update(JSON.stringify(messages)).digest('hex');
    const userId = (req as any).user?.id || 'anon';
    const cacheKey = `chat_${userId}_${messagesHash}`;
    const cachedResponse = appCache.get<string>(cacheKey);
    const token = req.headers.authorization?.split(' ')[1];

    let fullAssistantContent = '';

    if (cachedResponse) {
      fullAssistantContent = cachedResponse;
      res.write(`data: ${JSON.stringify({ content: cachedResponse })}\n\n`);
    } else {
      const stream = await AiService.streamChat(messages, systemInstruction, { subject }, userId, token);
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullAssistantContent += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      appCache.set(cacheKey, fullAssistantContent, 3600 * 24); // Cache for 24 hours
    }

    // Save messages to DB now that AI generated a response
    if (chatId) {
      if (originalUserContent) {
        const { error: userErr } = await getClient(req).from('messages').insert([{
          chat_id: chatId,
          role: 'user',
          content: originalUserContent
        }]);
        if (userErr) logger.error("Error saving user message:", userErr);
      }

      if (fullAssistantContent) {
        const { error: astErr } = await getClient(req).from('messages').insert([{
          chat_id: chatId,
          role: 'assistant',
          content: fullAssistantContent
        }]);
        if (astErr) logger.error("Error saving assistant message:", astErr);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err: any) {
    if (res.headersSent) {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: err.message || 'Stream error' })}\n\n`);
        res.end();
      } else {
        logger.error('Error after chat stream ended:', err);
      }
    } else {
      next(err);
    }
  }
};

export const handleVoiceTranscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    // Sanitize the file path to prevent Path Traversal
    const filePath = path.resolve(os.tmpdir(), path.basename(file.path));
    const language = (req.body as any).language || 'en';

    const transcription = await BhashiniService.transcribeAudio(filePath, language);

    // Clean up the temporary file
    fs.unlink(filePath, (err: NodeJS.ErrnoException | null) => {
      if (err) logger.error('[Voice] Failed to delete temp audio file:', err);
    });

    res.json({ text: transcription });
  } catch (err: any) {
    logger.error('Voice transcription error:', err);
    next(err);
  }
};

export const handleTextToSpeech = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, language } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required and must be a string' });
    }
    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text exceeds maximum allowed length of 5000 characters' });
    }

    const audioBuffer = await BhashiniService.textToSpeech(text, language || 'en');

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.send(audioBuffer);
  } catch (err: any) {
    logger.error('TTS error:', err);
    next(err);
  }
};

export const handleVisionOCR = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { buffer, mimetype } = req.file;
    const transcribedText = await AiService.performVisionOCR(buffer, mimetype);

    res.json({ text: transcribedText });
  } catch (err: any) {
    logger.error('Vision OCR Error:', err);
    res.status(500).json({ error: err.message || 'Failed to process image' });
  }
};

export const handleStudyRoomModerate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messages, currentParticipants } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array cannot be empty' });
    }
    if (messages.length > 100) {
      return res.status(400).json({ error: 'Too many messages' });
    }
    if (!currentParticipants || !Array.isArray(currentParticipants)) {
      return res.status(400).json({ error: 'currentParticipants must be an array' });
    }

    const lastMessage = messages[messages.length - 1];

    if (!lastMessage.content.includes('?') && lastMessage.content.length < 15) {
      return res.json({ response: null });
    }

    const otherParticipants = currentParticipants.filter((p: string) => p !== lastMessage.name);

    if (otherParticipants.length === 0) {
      return res.json({ response: "I see you're asking a question! Let's wait a moment to see if anyone else joins the room who might know the answer, or I can help if you want!" });
    }

    const randomPeer = otherParticipants[Math.floor(Math.random() * otherParticipants.length)];

    const prompt = `You are a Study Room AI Moderator. You are in a chat room with multiple students.
Student "${lastMessage.name}" just asked: "${lastMessage.content}"
Other students in the room: ${otherParticipants.join(', ')}.

Your goal is to encourage peer-to-peer learning. Do NOT answer the question directly. 
Instead, acknowledge the question and explicitly ask "${randomPeer}" (or anyone else) if they want to try answering it first. 
Keep your response under 3 sentences, very friendly, and engaging.`;

    const moderationSchema = {
      type: "object",
      properties: {
        response: { type: "string" }
      },
      required: ["response"],
      additionalProperties: false
    };

    const result = await AiService.executeWithFallback(
      [{ role: "system", content: prompt }],
      moderationSchema,
      'moderation_response',
      undefined,
      'solver',
      0.7
    );

    res.json({ response: result.response || null });
  } catch (err) {
    next(err);
  }
};
