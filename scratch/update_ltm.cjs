const fs = require('fs');
let code = fs.readFileSync('server/services/ai.service.ts', 'utf8');

// 1. Add retrieveUserMemory
const retrieveUserMemoryCode = `
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
      
      const memories = data.map((d: any) => \`- \${d.content}\`).join('\\n');
      return \`\\n[LONG-TERM MEMORY RECALL]\\nThe following are insights about the student's learning history (weaknesses, masteries, habits):\\n\${memories}\\n\\nUse this context to heavily personalize your Socratic approach. Focus on addressing their known weaknesses.\\n\`;
    } catch (err) {
      logger.error('Failed to retrieve user memory:', err);
      return '';
    }
  }
`;

// Insert it before static async generateSolverCritic
code = code.replace(/static async generateSolverCritic\(/, retrieveUserMemoryCode + '\n  static async generateSolverCritic(');

// 2. Fetch memory and inject into solver prompt
const fetchMemoryCode = `
    const [searchQuery, userMemoryContext] = await Promise.all([
      AiService.extractSearchQuery(query, messages),
      AiService.retrieveUserMemory(userId || '', query, token)
    ]);
`;

code = code.replace(/const searchQuery = await AiService\.extractSearchQuery\(query, messages\);/, fetchMemoryCode);

const injectMemoryCode = `
    const solverSystemPrompt = \`\${MASTER_SYSTEM_PROMPT}

You are helping a student with: \${subject}
\${userMemoryContext}
[RETRIEVED CONTEXT]`;
code = code.replace(/const solverSystemPrompt = \`\$\{MASTER_SYSTEM_PROMPT\}\n\nYou are helping a student with: \$\{subject\}\n\n\[RETRIEVED CONTEXT\]/, injectMemoryCode);

// 3. Update Critic schema
const criticSchemaUpdate = `isOutOfScope: { type: "boolean" },
        newInsights: { type: "array", items: { type: "string" }, description: "Optional. 1-2 sentence insights about the student's conceptual weakness or mastery based on their query. Only output if a clear pattern or gap is spotted." },`;
code = code.replace(/isOutOfScope: \{ type: "boolean" \},/, criticSchemaUpdate);

// 4. Update Critic prompt
const criticPromptAppend = `
Evaluate their pedagogy. Is the guiding question too easy? Does it give away the answer?

If the user's query demonstrates a clear conceptual weakness, misunderstanding, or a newly mastered concept, generate a brief insight in the 'newInsights' array (e.g., "Student struggles with vector cross products"). This will be saved to their long-term memory.
`;

code = code.replace(/Evaluate their pedagogy\. Is the guiding question too easy\? Does it give away the answer\?/, criticPromptAppend);

// 5. Save insights asynchronously
const saveInsightsCode = `
    const finalResult = {
      solverData,
      criticData,
      citation: bestCitation,
      isConversation: false,
      criticAuditStatus: criticData.criticAuditStatus
    };

    // [LONG-TERM MEMORY] Save new insights asynchronously
    if (userId && criticData.newInsights && Array.isArray(criticData.newInsights) && criticData.newInsights.length > 0) {
      setTimeout(async () => {
        try {
          logger.info(\`[LTM] Saving \${criticData.newInsights.length} new insights for user \${userId}\`);
          const extractor = await getExtractor();
          const client = getAuthSupabase(token);
          
          for (const insight of criticData.newInsights) {
             const output = await extractor(insight, { pooling: 'mean', normalize: true });
             const embedding = Array.from(output.data);
             
             const { error } = await client.from('user_memories').insert({
               user_id: userId,
               content: insight,
               embedding
             });
             
             if (error) {
               logger.error('[LTM] Failed to insert insight:', error);
             }
          }
        } catch(err) {
           logger.error('[LTM] Error in async insight saving task:', err);
        }
      }, 0);
    }

    return finalResult;
`;
code = code.replace(/return \{\n\s*solverData,\n\s*criticData,\n\s*citation: bestCitation,\n\s*isConversation: false,\n\s*criticAuditStatus: criticData\.criticAuditStatus\n\s*\};/m, saveInsightsCode);


fs.writeFileSync('server/services/ai.service.ts', code);
console.log('LTM logic injected.');
