import { supabase, getAuthSupabase } from '../../lib/supabase';
import { getExtractor } from '../../utils/pipeline';
import { logger } from '../../utils/logger';
import { AiClient } from './client';
import { getExpansionSchema, getRerankSchema } from './schemas';

export class AiContext {
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
      logger.error('Retrieval error:', err);
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
      logger.error('Retrieval error:', err);
      return [];
    }
  }

  static async advancedRetrieveContext(query: string, historyText: string, filter?: { subject?: string; chapter?: string }, userId?: string, token?: string) {
    try {
      const expansionPrompt = `Given the user's latest question and chat history, generate 3 distinct search queries to find the most relevant information in a textbook.
1. The first query should be the core conceptual question.
2. The second query should focus on any specific formulas, equations, or laws mentioned or implied.
3. The third query should be a broader topical search or rephrase the question differently.
Return ONLY a JSON array of 3 strings.

History:
${historyText}

Latest Question: ${query}`;

      const expansionSchema = getExpansionSchema();

      const expansionRes = await AiClient.executeWithFallback(
        [
          { role: 'system', content: "You are an expert search query generator for a physics/math RAG pipeline." },
          { role: 'user', content: expansionPrompt }
        ],
        expansionSchema, 
        "query_expansion", 
        userId, 
        "rag_expansion", 
        0.2,
        undefined,
        undefined,
        undefined,
        token
      );

      const queries = expansionRes.queries && Array.isArray(expansionRes.queries) ? expansionRes.queries : [query];
      if (!queries.includes(query)) queries.push(query);

      logger.debug(`[AI Engine] RAG Multi-Query Expansion generated:`, queries);

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

      const rerankSchema = getRerankSchema();

      const rerankRes = await AiClient.executeWithFallback(
        [
          { role: 'system', content: "You are a strict relevance judge for an academic RAG pipeline. Only highly relevant documents should score above 5." },
          { role: 'user', content: rerankPrompt }
        ],
        rerankSchema,
        "context_reranker",
        userId,
        "rag_rerank",
        0.0,
        undefined,
        undefined,
        undefined,
        token
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
        logger.info(`[AI Engine] RAG Re-ranker filtered out all documents or failed. Falling back to top RRF result.`);
        finalContexts = [topDocs[0].content];
      }

      logger.info(`[AI Engine] Advanced RAG Pipeline completed. Yielded ${finalContexts.length} highly relevant chunks.`);
      return finalContexts.join('\n\n');

    } catch (err) {
      logger.error('[AI Engine] Advanced RAG Pipeline Error:', err);
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
      logger.warn('[AI Engine] Failed to fetch user mastery:', err);
      return '';
    }
  }

  static async retrieveUserMemory(userId: string, query: string, token?: string) {
    if (!userId) return '';
    try {
      const extractor = await getExtractor();
      const output = await extractor(query, { pooling: 'mean', normalize: true });
      const query_embedding = Array.from(output.data);

      const client = getAuthSupabase(token);
      const { data, error } = await client.rpc('match_user_memories', {
        p_user_id: userId,
        query_embedding,
        match_threshold: 0.2, // lower threshold to catch subtle insights
        match_count: 3
      });

      if (error) throw error;
      if (!data || data.length === 0) return '';
      
      const memories = data.map((d: any) => `- ${d.content}`).join('\n');
      return `\n[LONG-TERM MEMORY RECALL]\nThe following are insights about the student's learning history (weaknesses, masteries, habits):\n${memories}\n\nUse this context to heavily personalize your Socratic approach. Focus on addressing their known weaknesses.\n`;
    } catch (err) {
      logger.error('Failed to retrieve user memory:', err);
      return '';
    }
  }
}
