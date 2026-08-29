import { Request, Response, NextFunction } from 'express';
import { supabase, getAuthSupabase } from '../lib/supabase';

const getClient = (req: Request) => {
  const tokenHeader = req.headers.authorization?.split(' ')[1];
  return getAuthSupabase(tokenHeader);
};

export const getUserChats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const client = getClient(req);
    const { data, error } = await client
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase error in getUserChats:', error.message);
      return res.json([]);
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const createChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, title } = req.body;
    if (!userId || !title) {
      return res.status(400).json({ error: 'userId and title are required' });
    }

    const client = getClient(req);
    const { data, error } = await client
      .from('chats')
      .insert([{ user_id: userId, title }])
      .select()
      .single();

    if (error) {
      console.warn('Supabase error in createChat, falling back to mock chat:', error.message);
      return res.json({ id: 'mock-chat-' + Date.now(), user_id: userId, title, created_at: new Date().toISOString() });
    }
    res.json(data);
  } catch (err: any) {
    next(err);
  }
};

export const getChatMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' });
    }

    const client = getClient(req);
    const { data, error } = await client
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Supabase error in getChatMessages:', error.message);
      return res.json([]);
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getUserMastery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const client = getClient(req);
    const { data, error } = await client
      .from('user_topic_mastery')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.warn('Supabase error in getUserMastery:', error.message);
      return res.json([]);
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getCohortAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Get cohort analytics (topics)
    const { data: cohortData, error: cohortError } = await supabase.rpc('get_cohort_analytics');
    if (cohortError) {
      console.warn('Supabase error in getCohortAnalytics:', cohortError.message);
      return res.json({ cohorts: [], globalStats: { overallVerifiedRate: 0, totalQueries: 0 } });
    }
    const formattedCohorts = (cohortData || []).map((row: any) => ({
      cohortId: row.cohort_id,
      meanScore: Number(row.mean_score) || 0,
      variance: 0,
      participation: Number(row.participation) || 0,
    }));

    // 2. Get overall verified rate securely
    const { data: overallVerifiedRate, error: rateError } = await supabase.rpc('get_global_verified_rate');
    if (rateError) console.warn('Supabase error getting global verified rate:', rateError.message);

    // 3. Get total queries count securely
    const { data: totalQueries, error: countError } = await supabase.rpc('get_total_queries');
    if (countError) console.warn('Supabase error getting total queries:', countError.message);

    const total = totalQueries || 0;
    const rate = overallVerifiedRate || 0;
    const verifiedCount = Math.round((rate / 100) * total);
    const criticCaughtErrors = total - verifiedCount;

    res.json({
      cohorts: formattedCohorts,
      globalStats: {
        overallVerifiedRate: rate,
        totalQueries: total,
        criticCaughtErrors: criticCaughtErrors > 0 ? criticCaughtErrors : 0
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getPublicTrustStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: overallVerifiedRate, error: rateError } = await supabase.rpc('get_global_verified_rate');
    if (rateError) console.warn('Supabase error getting global verified rate:', rateError.message);

    const { data: totalQueries, error: countError } = await supabase.rpc('get_total_queries');
    if (countError) console.warn('Supabase error getting total queries:', countError.message);

    const total = totalQueries || 0;
    const rate = overallVerifiedRate || 0;
    const verifiedCount = Math.round((rate / 100) * total);
    const criticCaughtErrors = total - verifiedCount;

    res.json({
      overallVerifiedRate: rate,
      totalQueries: total,
      criticCaughtErrors: criticCaughtErrors > 0 ? criticCaughtErrors : 0
    });
  } catch (err) {
    next(err);
  }
};

export const getPersonalCohortAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = getClient(req);
    
    // 1. Get user's topic mastery data (RLS will filter automatically)
    const { data: masteryData, error: masteryError } = await client
      .from('user_topic_mastery')
      .select('*');

    if (masteryError) {
      console.warn('Supabase error in getPersonalCohortAnalytics:', masteryError.message);
      return res.json({ cohorts: [], globalStats: { overallVerifiedRate: 0, totalQueries: 0 } });
    }

    const formattedCohorts = (masteryData || []).map((row: any) => {
      const total = (row.verified_count || 0) + (row.flagged_count || 0);
      const meanScore = total > 0 ? (row.verified_count / total) * 100 : 0;
      return {
        cohortId: row.topic_title || row.topic_id,
        meanScore,
        variance: 0,
        participation: 1
      };
    });

    let overallVerifiedRate = 0;
    let totalVerified = 0;
    let totalFlagged = 0;
    
    if (masteryData) {
      masteryData.forEach(row => {
        totalVerified += (row.verified_count || 0);
        totalFlagged += (row.flagged_count || 0);
      });
      const total = totalVerified + totalFlagged;
      if (total > 0) {
        overallVerifiedRate = (totalVerified / total) * 100;
      }
    }

    // 3. Get total queries count for this user
    // Since RLS is on 'messages' checking chat owner, this will count only their messages
    const { count: totalQueries, error: messagesError } = await client
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user');

    const totalQs = totalQueries || 0;
    const rate = overallVerifiedRate || 0;
    const verifiedCount = Math.round((rate / 100) * totalQs);
    const criticCaughtErrors = totalQs - verifiedCount;

    res.json({
      cohorts: formattedCohorts,
      globalStats: {
        overallVerifiedRate,
        totalQueries: totalQs,
        criticCaughtErrors: criticCaughtErrors > 0 ? criticCaughtErrors : 0
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const client = getClient(req);
    const { data, error } = await client
      .from('user_topic_mastery')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.warn('Supabase error in getRecommendations:', error.message);
      return res.json([]);
    }

    // Filter to at least 1 attempt, sort by masteryScore ascending, take top 3
    const recommendations = (data || [])
      .filter(t => (t.verified_count + t.flagged_count) > 0)
      .map(t => {
        const total = t.verified_count + t.flagged_count;
        const score = Math.round((t.verified_count / total) * 100);
        return { ...t, masteryScore: score, totalAttempts: total };
      })
      .sort((a, b) => a.masteryScore - b.masteryScore)
      .slice(0, 3);

    res.json(recommendations);
  } catch (err) {
    next(err);
  }
};

export const flagForReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, chatId, messageId, question, criticNotes } = req.body;
    
    if (!userId || !question) {
      return res.status(400).json({ error: 'userId and question are required' });
    }

    const client = getClient(req);
    const { data, error } = await client
      .from('review_queue')
      .insert([{
        user_id: userId,
        chat_id: chatId,
        message_id: messageId,
        question: question,
        critic_notes: criticNotes
      }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const deleteChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    if (!chatId) return res.status(400).json({ error: 'Chat ID is required' });

    const client = getClient(req);
    const { error } = await client.from('chats').delete().eq('id', chatId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const deleteAllUserChats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const client = getClient(req);
    // Because RLS is active, this will only delete chats where user_id matches the authenticated token
    const { error } = await client.from('chats').delete().eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const renameChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    const { title } = req.body;
    if (!chatId || !title) return res.status(400).json({ error: 'Chat ID and title are required' });

    const client = getClient(req);
    const { data, error } = await client
      .from('chats')
      .update({ title })
      .eq('id', chatId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const toggleChatPin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    const { is_pinned } = req.body;
    if (!chatId || typeof is_pinned !== 'boolean') {
      return res.status(400).json({ error: 'Chat ID and is_pinned boolean are required' });
    }

    const client = getClient(req);
    const { data, error } = await client
      .from('chats')
      .update({ is_pinned })
      .eq('id', chatId)
      .select()
      .single();

    if (error) {
      console.warn("Supabase error pinning chat (column might be missing):", error.message);
      // Fail gracefully if DB doesn't support pinning yet
      return res.json({ id: chatId, is_pinned });
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const toggleMessagePin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.params;
    const { is_pinned } = req.body;
    if (!messageId || typeof is_pinned !== 'boolean') {
      return res.status(400).json({ error: 'Message ID and is_pinned boolean are required' });
    }

    const client = getClient(req);
    const { data, error } = await client
      .from('messages')
      .update({ is_pinned })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getReviewQueue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = getClient(req);
    const { data, error } = await client
      .from('review_queue')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    next(err);
  }
};

export const resolveReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reviewId } = req.params;
    const { resolutionNotes } = req.body;
    const client = getClient(req);
    const { data, error } = await client
      .from('review_queue')
      .update({ resolution_notes: resolutionNotes, status: 'resolved' })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getFlaggedStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = getClient(req);
    
    // We fetch all mastery records that indicate struggling
    const { data, error } = await client
      .from('user_topic_mastery')
      .select('*');

    if (error) {
      console.warn('Supabase error in getFlaggedStudents:', error.message);
      return res.json([]);
    }

    // Process and group by user_id
    const flaggedUsers = new Map<string, any>();

    (data || []).forEach((row: any) => {
      const totalAttempts = row.verified_count + row.flagged_count;
      const successRate = totalAttempts > 0 ? (row.verified_count / totalAttempts) : 1;
      
      // Criteria for struggling: success rate <= 0.6 AND at least 2 flagged attempts OR strictly flagged > 2
      if ((successRate <= 0.6 && row.flagged_count >= 2) || row.flagged_count > 2) {
        if (!flaggedUsers.has(row.user_id)) {
          // We can use a mock name based on user_id suffix since we don't store PII in this table
          const mockName = `Student ${row.user_id.substring(0, 5).toUpperCase()}`;
          flaggedUsers.set(row.user_id, {
            userId: row.user_id,
            name: mockName,
            riskScore: 0,
            failedTopics: []
          });
        }
        
        const user = flaggedUsers.get(row.user_id);
        user.failedTopics.push({
          topicId: row.topic_id,
          title: row.topic_title || row.topic_id,
          flaggedCount: row.flagged_count,
          verifiedCount: row.verified_count
        });
        
        // Increase risk score heavily based on flagged counts
        user.riskScore += row.flagged_count * 10;
      }
    });

    // Sort by highest risk score
    const result = Array.from(flaggedUsers.values()).sort((a, b) => b.riskScore - a.riskScore);
    
    res.json(result);
  } catch (err) {
    next(err);
  }
};
