import OpenAI from 'openai';
import { AiSolverCritic } from '../../server/services/ai/solver-critic';
import { appCache } from '../../server/utils/cache';

jest.mock('openai');
jest.mock('../../server/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn().mockResolvedValue({ data: [{ id: '1', content: 'Mock DB context' }] }),
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [] }),
      insert: jest.fn().mockResolvedValue({ error: null })
    })
  },
  getAuthSupabase: jest.fn().mockReturnValue({
    rpc: jest.fn().mockResolvedValue({ data: [] }),
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [] }),
      insert: jest.fn().mockResolvedValue({ error: null })
    })
  })
}));

jest.mock('../../server/utils/pipeline', () => ({
  getExtractor: jest.fn().mockResolvedValue(
    jest.fn().mockResolvedValue({ data: new Float32Array(384).fill(0.1) })
  )
}));

jest.mock('../../server/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('generateSolverCritic Pipeline Orchestration', () => {
  let mockCreate: jest.Mock;
  let solverCallCount = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    appCache.clear();
    solverCallCount = 0;

    mockCreate = jest.fn();
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }));
  });

  const setupMockCreate = (overrides: any = {}) => {
    mockCreate.mockImplementation((args: any) => {
      const messagesStr = JSON.stringify(args.messages);
      
      if (messagesStr.includes('strict router')) {
        return Promise.resolve({ choices: [{ message: { content: overrides.intent || 'HARD_ACADEMIC' } }] });
      }
      if (messagesStr.includes('expert search query generator')) {
        return Promise.resolve({ choices: [{ message: { content: JSON.stringify({ queries: ['test'] }) } }] });
      }
      if (messagesStr.includes('strict relevance judge')) {
        return Promise.resolve({ choices: [{ message: { content: JSON.stringify({ scoredExcerpts: [{ excerptIndex: 0, score: 9 }] }) } }] });
      }
      if (messagesStr.includes('Are these mathematical answers fundamentally equivalent')) {
        console.log("CONSENSUS CALLED WITH:", messagesStr);
        return Promise.resolve({ choices: [{ message: { content: overrides.consensus || 'YES' } }] });
      }
      if (messagesStr.includes('StudyFlow AI Critic Auditor')) {
        console.log("CRITIC CALLED");
        const defaultCritic = {
          criticAuditStatus: 'VERIFIED',
          confidenceScore: 90,
          isOutOfScope: false,
          criticAuditNotes: 'Looks good',
          stepVerdicts: [{ stepNumber: 1, verified: true }]
        };
        return Promise.resolve({ choices: [{ message: { content: JSON.stringify(overrides.critic || defaultCritic) } }] });
      }
      if (messagesStr.includes('Intervention Agent')) {
        const intervention = {
          interventions: [{ question: "Q", options: ["A", "B", "C", "D"], correctIndex: 0, explanation: "E" }]
        };
        return Promise.resolve({ choices: [{ message: { content: JSON.stringify(overrides.intervention || intervention) } }] });
      }
      
      // Solver
      if (messagesStr.includes('Provide a step-by-step derivation')) {
        solverCallCount++;
        let eq = 'x=2';
        if (overrides.simulateDisagreement) {
          eq = `x=${solverCallCount}`;
        }
        
        const solverResponse = JSON.stringify({
          steps: [{ stepNumber: 1, explanation: 'step', mathEquation: 'eq' }],
          finalEquation: eq,
          citation: { chapter: 'Physics' }
        });
        
        console.log(`SOLVER CALLED ${solverCallCount}, eq=${eq}, stream=${args.stream}`);

        if (args.stream) {
          return Promise.resolve({
            [Symbol.asyncIterator]: async function* () {
              yield { choices: [{ delta: { content: solverResponse } }] };
            }
          });
        } else {
          return Promise.resolve({
            choices: [{
              message: {
                content: solverResponse
              }
            }]
          });
        }
      }
      
      return Promise.resolve({ choices: [{ message: { content: '{}' } }] });
    });
  };

  it('1. should return VERIFIED with full steps when critic approves', async () => {
    setupMockCreate();
    
    const res = await AiSolverCritic.generateSolverCritic('Calculate the velocity of a 5kg mass', 'Physics', 'en', [], undefined, 'user123');
    
    expect(res.criticAuditStatus).toBe('VERIFIED');
    expect(res.steps).toBeDefined();
    expect(res.finalEquation).toBeDefined();
  });

  it('2. should redact steps and generate intervention micro-quiz for low confidence critic response', async () => {
    setupMockCreate({
      critic: {
        criticAuditStatus: 'FLAGGED',
        confidenceScore: 30,
        isOutOfScope: false,
        criticAuditNotes: 'Completely wrong',
        stepVerdicts: [{ stepNumber: 1, verified: false }]
      }
    });

    const res = await AiSolverCritic.generateSolverCritic('Calculate the velocity of a 5kg mass', 'Physics', 'en', [], undefined, 'user123');

    expect(res.criticAuditStatus).toBe('FLAGGED');
    expect(res.steps).toBeUndefined();
    expect(res.finalEquation).toBeUndefined();
    expect(res.intervention).toBeDefined();
    expect(res.intervention.length).toBeGreaterThan(0);
  });

  it('3. should handle self-consistency path with disagreement', async () => {
    setupMockCreate({
      simulateDisagreement: true,
      consensus: 'NO',
      critic: {
        criticAuditStatus: 'VERIFIED',
        confidenceScore: 90, 
        isOutOfScope: false,
        criticAuditNotes: 'Disagreed',
        stepVerdicts: [{ stepNumber: 1, verified: true }]
      }
    });

    const res = await AiSolverCritic.generateSolverCritic('Calculate the velocity of a 5kg mass', 'Physics', 'en', [], undefined, 'user123');

    // Due to disagreement, 90 is clamped to 60. A score of 60 means finalStatus is FLAGGED.
    expect(res.criticAuditStatus).toBe('FLAGGED');
    
    // finalCriticData.confidenceScore is 90, which is >= 50, so steps are NOT redacted.
    expect(res.steps).toBeDefined();
    expect(res.finalEquation).toBeDefined();
    
    // The self-consistency consensus check is triggered because of HARD_ACADEMIC and 3 calls.
    // The solver was called 3 times originally, plus 1 time for the correction loop = 4 times.
    expect(solverCallCount).toBeGreaterThanOrEqual(4);
  });

  it('4. should exit early on CONVERSATION intent without calling solver or critic', async () => {
    mockCreate.mockImplementation((args: any) => {
      const messagesStr = JSON.stringify(args.messages);
      if (messagesStr.includes('strict router')) {
        return Promise.resolve({ choices: [{ message: { content: 'CONVERSATION' } }] });
      }
      
      return Promise.resolve({
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: 'Hello this is conversation.' } }] };
        }
      });
    });

    const res = await AiSolverCritic.generateSolverCritic('Hi there', 'Physics', 'en', [], undefined, 'user123');

    expect(res.isConversation).toBe(true);
    expect(res.content).toContain('Hello this is conversation');
    expect(solverCallCount).toBe(0); 
    
    const wasCriticCalled = mockCreate.mock.calls.some(call => JSON.stringify(call[0].messages).includes('StudyFlow AI Critic Auditor'));
    expect(wasCriticCalled).toBe(false);
  });
});
