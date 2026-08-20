import { Request, Response, NextFunction } from 'express';
import { AiService } from '../services/ai.service';
import { supabase, getAuthSupabase } from '../lib/supabase';
import { appCache } from '../utils/cache';
import crypto from 'crypto';

const getClient = (req: Request) => {
  const tokenHeader = req.headers.authorization?.split(' ')[1];
  return getAuthSupabase(tokenHeader);
};

export const handleSolverCritic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, subject = 'NCERT Class 11 Physics', chatId, userId, language = 'en', messages = [] } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const isStream = req.query.stream === 'true' || req.headers.accept === 'text/event-stream';

    let finalResponse: any;

    if (isStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

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
        } else if (eventData.type === 'conversation_chunk') {
          res.write(`event: conversation_chunk\ndata: ${JSON.stringify(eventData.data)}\n\n`);
        }
      };

      const resultData = await AiService.generateSolverCritic(query, subject, language, messages, onEvent, userId);
      
      finalResponse = {
        id: 'sol-' + Date.now(),
        query,
        subject,
        ...resultData,
        timestamp: new Date().toISOString(),
      };

      res.write(`event: critic_verdict\ndata: ${JSON.stringify(finalResponse)}\n\n`);
      res.end();
    } else {
      const resultData = await AiService.generateSolverCritic(query, subject, language, messages, undefined, userId);
      
      finalResponse = {
        id: 'sol-' + Date.now(),
        query,
        subject,
        ...resultData,
        timestamp: new Date().toISOString(),
      };
      res.json(finalResponse);
    }

    // Save user message to DB // FIX: Bug 6
    if (chatId && finalResponse) { // FIX: Bug 6
      const { error: userErr } = await getClient(req).from('messages').insert([{ // FIX: Bug 6
        chat_id: chatId, // FIX: Bug 6
        role: 'user', // FIX: Bug 6
        content: query // FIX: Bug 6
      }]); // FIX: Bug 6
      if (userErr) console.error("Error saving user message:", userErr); // FIX: Bug 6
    } // FIX: Bug 6

    // Save assistant message to DB (stringified JSON)
    if (chatId && finalResponse) {
      const { error: astErr } = await getClient(req).from('messages').insert([{
        chat_id: chatId,
        role: 'assistant',
        content: JSON.stringify(finalResponse)
      }]);
      if (astErr) console.error("Error saving assistant message:", astErr);
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
      if (masteryErr) console.error("Error upserting mastery:", masteryErr);
    }

  } catch (err: any) {
    if (res.headersSent) {
      if (!res.writableEnded) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: err.message || 'Stream error' })}\n\n`);
        res.end();
      } else {
        console.error('Error after stream ended:', err);
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

    const resultData = await AiService.generateTopicAudit(topicTitle, subtitle || '', unit, req.body.userId);
    res.json(resultData);
  } catch (err) {
    next(err);
  }
};

export const handleChatStream = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messages, chatId, subject } = req.body; // FIX: Bug 5

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

    let fullAssistantContent = '';

    if (cachedResponse) {
      fullAssistantContent = cachedResponse;
      res.write(`data: ${JSON.stringify({ content: cachedResponse })}\n\n`);
    } else {
      const stream = await AiService.streamChat(messages, systemInstruction, { subject }); // FIX: Bug 5
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullAssistantContent += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      appCache.set(cacheKey, fullAssistantContent, 3600 * 24); // Cache for 24 hours
    }

    res.write('data: [DONE]\n\n');
    res.end();

    // Save messages to DB now that AI generated a response
    if (chatId) {
      if (originalUserContent) {
        const { error: userErr } = await getClient(req).from('messages').insert([{
          chat_id: chatId,
          role: 'user',
          content: originalUserContent
        }]);
        if (userErr) console.error("Error saving user message:", userErr);
      }
      
      if (fullAssistantContent) {
        const { error: astErr } = await getClient(req).from('messages').insert([{
          chat_id: chatId,
          role: 'assistant',
          content: fullAssistantContent
        }]);
        if (astErr) console.error("Error saving assistant message:", astErr);
      }
    }

  } catch (err: any) {
    if (res.headersSent) {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: err.message || 'Stream error' })}\n\n`);
        res.end();
      } else {
        console.error('Error after chat stream ended:', err);
      }
    } else {
      next(err);
    }
  }
};
