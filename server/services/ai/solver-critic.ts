import { evaluate } from 'mathjs';
import { config } from '../../config/env';
import { appCache } from '../../utils/cache';
import { logger } from '../../utils/logger';
import { evaluateExpression } from '../../utils/mathSandbox';
import { getExtractor } from '../../utils/pipeline';
import { AiClient, MASTER_SYSTEM_PROMPT } from './client';
import { AiContext } from './context';
import { getSolverSchema, getCriticSchema, getCriticTools } from './schemas';

export class AiSolverCritic {
  static async generateSolverCritic(query: string, subject: string, language: string = 'en', messages: any[] = [], onEvent?: (event: any) => void, userId?: string, token?: string) {
    const languageMap: Record<string, string> = {
      'en': 'English',
      'bn': 'Bengali (Use ONLY proper Bengali script / বাংলা লিপি for ALL text. NEVER use English/Latin letters for Bengali words. No Romanized Bengali.)',
      'hi': 'Hindi (Use ONLY proper Devanagari script / देवनागरी for ALL text. NEVER use English/Latin letters for Hindi words. No Romanized Hindi.)'
    };
    const langName = languageMap[language] || language;

    let intent = 'HARD_ACADEMIC';
    try {
      if (query.length < 1000) {
        const primaryClient = AiClient.getPrimaryClient();
        const shortHistory = messages.slice(-4).map(m => ({ role: m.role, content: m.content }));
        
        const normalizedQuery = query.toLowerCase().trim();
        const casualGreetings = ['hello', 'hi', 'hey', 'yo', 'sup', 'what\'s up', 'whats up', 'how are you', 'good morning', 'good evening', 'good afternoon', 'write a python script', 'write a script'];
        
        if (casualGreetings.some(g => normalizedQuery.includes(g)) || (normalizedQuery.length < 20 && !/\d/.test(normalizedQuery))) {
          intent = 'CONVERSATION';
        } else {
          try {
            const client = config.useNewAiArchitecture ? AiClient.getClientForProvider(config.routerProvider) : AiClient.getPrimaryClient();
            const routerModel = config.useNewAiArchitecture ? config.routerModel : (config.multilingualAiModel || config.primaryAiModel);
            const intentRes = await client.chat.completions.create({
              model: routerModel,
              messages: [
                { role: 'system', content: 'You are a strict router. Classify the user\'s message into EXACTLY one word: "HARD_ACADEMIC", "EASY_ACADEMIC", or "CONVERSATION". No punctuation or explanation.\n- Output "HARD_ACADEMIC" ONLY for complex physics, math, chemistry, or rigorous science problems that require numeric calculation, mathematical derivation, formulas, or a step-by-step analytical solver.\n- Output "EASY_ACADEMIC" for simple factual academic questions, definitions, or basic conceptual explanations.\n- Output "CONVERSATION" for everything else, including general knowledge, writing help, coding, casual reasoning, small talk, and greetings.' },
                { role: 'user', content: 'Solve 2x^2 + 5x - 3 = 0' },
                { role: 'assistant', content: 'HARD_ACADEMIC' },
                { role: 'user', content: 'What is Newton\'s first law?' },
                { role: 'assistant', content: 'EASY_ACADEMIC' },
                { role: 'user', content: 'Write a python script to parse JSON' },
                { role: 'assistant', content: 'CONVERSATION' },
                { role: 'user', content: 'What caused the fall of the Roman Empire?' },
                { role: 'assistant', content: 'CONVERSATION' },
                { role: 'user', content: 'Calculate the tension in the rope if mass is 5kg and a=2m/s^2' },
                { role: 'assistant', content: 'HARD_ACADEMIC' },
                { role: 'user', content: 'Hello bro' },
                { role: 'assistant', content: 'CONVERSATION' },
                { role: 'user', content: 'What is a black hole?' },
                { role: 'assistant', content: 'EASY_ACADEMIC' },
                { role: 'user', content: query }
              ],
              max_tokens: 5,
              temperature: 0.1
            });
            intent = intentRes.choices[0].message.content?.trim().toUpperCase() || 'HARD_ACADEMIC';
          } catch (e) {
            logger.warn('[AI Engine] LLM Router failed, assuming HARD_ACADEMIC.', e);
          }
        }

        if (intent.includes('CONVERSATION')) {
          const convMessages = [
            { role: 'system', content: `You are StudyFlow AI, an advanced and highly capable AI assistant. You confidently answer general knowledge questions, write code, explain conceptual definitions, and engage in casual conversation. Respond naturally and directly in ${langName}. You are a fully capable assistant; do not force the user to study if they ask for writing help, general information, or just want to chat.` },
            ...shortHistory,
            { role: 'user', content: query }
          ];
          
          if (onEvent) {
            const stream = await AiClient.executeStreamWithFallback(convMessages, 'conversation');
            let fullText = '';
            for await (const chunk of stream as any) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                fullText += content;
                onEvent({ type: 'conversation_chunk', data: { content } });
              }
            }
            return { isConversation: true, content: fullText };
          } else {
            const stream = await AiClient.executeStreamWithFallback(convMessages, 'conversation');
            let fullText = '';
            for await (const chunk of stream as any) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                fullText += content;
              }
            }
            return { isConversation: true, content: fullText || 'Hello! How can I help you with your studies today?' };
          }
        }
      }
    } catch (err) {
      logger.warn('[AI Engine] Intent check failed, falling back:', err);
    }

    let historyToUse = messages;
    if (messages.length > 0 && messages[messages.length - 1].content === query) {
      historyToUse = messages.slice(0, -1);
    }

    let summarizedContext = '';
    let recentHistory = historyToUse.map(m => ({ role: m.role, content: m.content }));
    if (historyToUse.length > 12) {
      const earlierMessages = historyToUse.slice(0, -6);
      recentHistory = historyToUse.slice(-6).map(m => ({ role: m.role, content: m.content }));
      
      const earlierHistoryText = earlierMessages.map((m: any) => `${m.role}: ${m.content}`).join('\\n');
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
        summarizedContext = summaryRes.choices[0]?.message?.content || '';
      } catch (err) {
        logger.warn('[AI Engine] Summarization failed, falling back to truncated history:', err);
      }
    }
    
    const historyText = recentHistory.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\\n');
    
    const ncertContext = await AiContext.advancedRetrieveContext(query, historyText, { subject }, userId);

    const languageInstruction = `Respond entirely in ${langName}, including step descriptions and citation notes, but keep mathematical notation and variable names in English/standard math notation.`;
    const masteryContext = await AiContext.fetchUserMasteryContext(userId);
    
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
    
    const solverSchema = getSolverSchema();

    const historyString = JSON.stringify(recentHistory);
    const cacheKey = `solverCritic_${Buffer.from(query + subject + language + historyString).toString('base64')}`;
    const cachedResponse = appCache.get<any>(cacheKey);
    if (cachedResponse) {
      logger.info(`[AI Engine] Serving exact match cache for query.`);
      if (onEvent) {
        onEvent({ type: 'solver_draft', data: cachedResponse });
      }
      return cachedResponse;
    }

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
            const similarity = AiClient.cosineSimilarity(queryEmbedding, cachedData.embedding);
            if (similarity > 0.93) {
              logger.info(`[AI Engine] Serving semantic cache match (similarity: ${(similarity * 100).toFixed(1)}%).`);
              if (onEvent) {
                onEvent({ type: 'solver_draft', data: cachedData.response });
              }
              return cachedData.response;
            }
          }
        }
      }
    } catch (err) {
      logger.warn('[AI Engine] Semantic cache check failed:', err);
    }

    const solverPromises = [
      AiClient.executeWithFallback(solverMessages, solverSchema, 'solver_response', userId, 'solver', 0.3, (token) => {
        if (onEvent) {
          onEvent({ type: 'solver_chunk', data: { content: token } });
        }
      })
    ];
    
    if (intent === 'HARD_ACADEMIC') {
      solverPromises.push(
        AiClient.executeWithFallback(solverMessages, solverSchema, 'solver_response', userId, 'solver', 0.5),
        AiClient.executeWithFallback(solverMessages, solverSchema, 'solver_response', userId, 'solver', 0.7)
      );
    }

    const solverResults = await Promise.all(solverPromises);
    const solverDataPrimary = solverResults[0];
    const solverData = solverDataPrimary;
    
    let samplesDisagree = false;
    
    if (intent === 'HARD_ACADEMIC' && solverResults.length === 3) {
      const eq1 = solverResults[0].finalEquation || '';
      const eq2 = solverResults[1].finalEquation || '';
      const eq3 = solverResults[2].finalEquation || '';

      try {
        const primaryClient = AiClient.getPrimaryClient();
        const compareRes = await primaryClient.chat.completions.create({
          model: config.primaryAiModel,
          messages: [{ role: 'system', content: `Are these mathematical answers fundamentally equivalent? Answer ONLY "YES" or "NO".\n\nAnswer 1: ${eq1}\nAnswer 2: ${eq2}\nAnswer 3: ${eq3}` }],
          max_tokens: 5,
          temperature: 0.1
        });
        if (compareRes.choices[0]?.message?.content?.trim().toUpperCase().includes('NO')) {
          samplesDisagree = true;
        }
      } catch (e) {
        const clean = (s: string) => s.replace(/\s+/g, '').toLowerCase();
        samplesDisagree = !(clean(eq1) === clean(eq2) && clean(eq2) === clean(eq3));
      }

      logger.info(`[AI Engine] Primary derivation (T=0.3) shown to student. Consensus check: ${samplesDisagree ? 'DISAGREED' : 'AGREED'}. Eq1: ${eq1}, Eq2: ${eq2}, Eq3: ${eq3}`);
    } else {
      logger.info(`[AI Engine] EASY_ACADEMIC intent detected. Skipped 3-solver consensus to save latency.`);
    }

    if (onEvent) {
      onEvent({ type: 'solver_draft', data: solverData });
    }

    let sandboxEvaluation = null;
    if (solverData.finalEquation) {
      sandboxEvaluation = evaluateExpression(solverData.finalEquation);
      if (sandboxEvaluation !== null) {
        logger.info(`[AI Engine] Sandbox evaluated final equation to: ${sandboxEvaluation}`);
      }
    }

    const criticMessages = [
      { role: 'system', content: MASTER_SYSTEM_PROMPT + `\n\nYou are the StudyFlow AI Critic Auditor. You audit physics concepts for mathematical consistency, sign errors, reference frames, and edge cases. You have NEVER seen this derivation before and must audit it skeptically step by step.\n\n${languageInstruction}\n\nIMPORTANT: YOU MUST OUTPUT STRICTLY VALID JSON. DO NOT WRAP YOUR RESPONSE IN MARKDOWN BLOCK QUOTES (e.g. \`\`\`json). OUTPUT ONLY THE RAW JSON OBJECT.` },
      { role: 'system', content: `=== NCERT GROUND TRUTH KNOWLEDGE BASE ===\n${ncertContext}\n=========================================` },
      ...recentHistory,
      { role: 'user', content: `Fact-check the following Solver AI's derivation line-by-line against standard academic curriculum and the ground truth.

Question: "${query}"

Solver Derivation:
${JSON.stringify(solverData.steps, null, 2)}
${samplesDisagree ? "\nWARNING: Multiple independent solver runs produced conflicting final equations. Audit this derivation with EXTREME skepticism. The confidence score should likely be lowered." : ""}

CRITICAL RULES FOR AUDIT:
1. Dimensional Analysis: Explicitly check units/dimensions of the final equation.
2. Sign Conventions: Verify vectors, coordinate systems, and work/energy signs.
3. Hallucination Traps: Check if the Solver hallucinates friction coefficients, standard gravity constants, or incorrectly assumes massless strings.
- If the question is within academic scope and conceptually correct, set criticAuditStatus = "VERIFIED" and isOutOfScope = false.
- If it contains a trick assumption, asks for out-of-scope concepts, or fails the traps above, set criticAuditStatus = "FLAGGED", isOutOfScope = true, and provide criticAuditNotes.
- Provide a confidenceScore (0-100).
- Mark unverified steps clearly with verified = false and provide criticFeedback.` }
    ];
    
    const criticSchema = getCriticSchema();
    const criticTools = getCriticTools(evaluateExpression);

    const criticToolHandler = async (name: string, args: any) => {
      if (name === "evaluate_expression") {
        try {
          const val = evaluate(args.expression);
          return { result: String(val) };
        } catch (e: any) {
          return { error: e.message };
        }
      }
      return { error: "Unknown tool" };
    };

    const criticData = await AiClient.executeWithFallback(criticMessages, criticSchema, 'critic_response', userId, 'critic', 0.1, (token) => {
      if (onEvent) {
        onEvent({ type: 'critic_chunk', data: { content: token } });
      }
    }, criticTools, criticToolHandler);

    const stepVerdictsMap = new Map();
    if (criticData.stepVerdicts && Array.isArray(criticData.stepVerdicts)) {
      for (const v of criticData.stepVerdicts) {
        stepVerdictsMap.set(v.stepNumber, v);
      }
    }

    let effectiveConfidenceScore = criticData.confidenceScore;
    if (samplesDisagree && typeof effectiveConfidenceScore === 'number') {
      effectiveConfidenceScore = Math.min(effectiveConfidenceScore, 60);
    }

    let finalStatus = 'FLAGGED';
    if (criticData.criticAuditStatus === 'VERIFIED' && typeof effectiveConfidenceScore === 'number' && effectiveConfidenceScore >= 75) {
      finalStatus = 'VERIFIED';
    }

    let finalSolverData = solverData;
    let finalCriticData = criticData;

    if (finalStatus === 'FLAGGED') {
      logger.info(`[AI Engine] Critic flagged the response. Initiating Self-Correction Loop...`);
      const correctionMessages = [
        { role: 'system', content: MASTER_SYSTEM_PROMPT + `\n\nYou are StudyFlow AI, an intelligent study assistant. Provide a step-by-step derivation without verifying your own work. ${languageInstruction}${masteryContext}` },
        { role: 'system', content: `=== NCERT GROUND TRUTH KNOWLEDGE BASE ===\n${ncertContext}\n=========================================\n\nCRITICAL RULE FOR HONESTY:\n- You MUST ONLY use formulas and concepts found in the Ground Truth Knowledge Base above.` },
        ...recentHistory,
        { role: 'user', content: `Solve the following question strictly using principles relevant to ${subject}.\n\nQuestion: "${query}"\n\n=== CRITIC FEEDBACK FROM PREVIOUS ATTEMPT ===\nThe Critic AI rejected your previous derivation for the following reasons:\n${criticData.criticAuditNotes}\nStep-specific feedback:\n${JSON.stringify(criticData.stepVerdicts?.filter((v: any) => !v.verified) || [], null, 2)}\n\nCRITICAL INSTRUCTION: You must rewrite your derivation to address ALL of the Critic's feedback. Do not repeat the same mistakes.` }
      ];

      const correctedSolverData = await AiClient.executeWithFallback(correctionMessages, solverSchema, 'solver_response', userId, 'solver', 0.4, (token) => {
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

      const reCriticData = await AiClient.executeWithFallback(reCriticMessages, criticSchema, 'critic_response', userId, 'critic', 0.1, (token) => {
        if (onEvent) {
          onEvent({ type: 'critic_chunk', data: { content: token, isCorrection: true } });
        }
      }, criticTools, criticToolHandler);
      
      finalSolverData = correctedSolverData;
      finalCriticData = reCriticData;
      
      let reEffectiveConfidenceScore = reCriticData.confidenceScore;
      if (samplesDisagree && typeof reEffectiveConfidenceScore === 'number') {
        reEffectiveConfidenceScore = Math.min(reEffectiveConfidenceScore, 60);
      }

      if (reCriticData.criticAuditStatus === 'VERIFIED' && typeof reEffectiveConfidenceScore === 'number' && reEffectiveConfidenceScore >= 75) {
        finalStatus = 'VERIFIED';
      } else {
        finalStatus = 'FLAGGED';
      }
      
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

    const finalResponse: any = {
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

    if (finalStatus === 'FLAGGED') {
      try {
        logger.info(`[AI Engine] Response FLAGGED. Triggering Intervention Agent...`);
        const primaryClient = AiClient.getPrimaryClient();
        const interventionRes = await primaryClient.chat.completions.create({
          model: config.primaryAiModel,
          messages: [
            { role: 'system', content: 'You are an educational Intervention Agent. The student failed to understand a concept or asked a flawed question. Based on the critic notes, generate a 2-question multiple-choice micro-quiz to test their core understanding before they can proceed. Output ONLY valid JSON matching this schema: { "interventions": [ { "question": "string", "options": ["string", "string", "string", "string"], "correctIndex": number, "explanation": "string" } ] }' },
            { role: 'user', content: `Topic: ${subject}\nQuestion: ${query}\nCritic Notes: ${finalCriticData.criticAuditNotes}` }
          ],
          response_format: { type: 'json_object' }
        });
        
        const interventionData = JSON.parse(interventionRes.choices[0].message.content || '{}');
        finalResponse.intervention = interventionData.interventions || null;
      } catch (err) {
        logger.warn(`[AI Engine] Intervention Agent failed:`, err);
      }

      if ((finalCriticData.confidenceScore || 0) < 50) {
        delete finalResponse.steps;
        delete finalResponse.finalEquation;
        delete finalResponse.citation;
      }
    }

    appCache.set(cacheKey, finalResponse, 3600 * 24);
    
    if (queryEmbedding) {
      let semanticCount = 0;
      let oldestKey = '';
      let oldestTime = Infinity;
      for (const [key] of appCache.entries()) {
        if (key.startsWith('semanticCache_')) {
          semanticCount++;
          const parts = key.split('_');
          const time = parseInt(parts[1] || '0', 10);
          if (time < oldestTime) {
            oldestTime = time;
            oldestKey = key;
          }
        }
      }
      if (semanticCount >= 500 && oldestKey) {
        appCache.delete(oldestKey);
      }

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
}
