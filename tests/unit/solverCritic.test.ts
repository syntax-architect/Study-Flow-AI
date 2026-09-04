import { AiSolverCritic } from '../../server/services/ai/solver-critic';
import { AiClient } from '../../server/services/ai/client';
import { AiContext } from '../../server/services/ai/context';
import { appCache } from '../../server/utils/cache';

jest.mock('../../server/services/ai/client');
jest.mock('../../server/services/ai/context');
jest.mock('../../server/services/ai/schemas', () => ({
  getSolverSchema: jest.fn(),
  getCriticSchema: jest.fn(),
  getCriticTools: jest.fn(),
  getSolverTools: jest.fn()
}));
jest.mock('../../server/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Confidence-based redaction logic', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    appCache.clear();
    (AiContext.retrieveContext as jest.Mock).mockResolvedValue({
      success: true,
      context: 'Test context'
    });
  });

  it('should strip steps, finalEquation, and citation when confidenceScore is 49', async () => {
    const mockSolverData = {
      title: 'Test',
      summary: 'Summary',
      steps: [{ stepNumber: 1, title: 'Step 1', description: 'Desc', mathBlock: null }],
      finalEquation: 'x = 42',
      citation: { textbook: 'Book', chapter: '1', notes: 'Notes', ncertPage: null },
      pipelineLog: { solverDraftSummary: 'Draft', ncertSourceMatch: 'Match' }
    };

    const mockCriticData = {
      criticAuditStatus: 'VERIFIED',
      isOutOfScope: false,
      criticAuditNotes: 'Good job',
      confidenceScore: 49,
      stepVerdicts: [{ stepNumber: 1, verified: true, criticFeedback: null }],
      pipelineLog: { criticVerificationPassed: true, criticWarnings: [] }
    };

    (AiClient.executeWithFallback as jest.Mock).mockImplementation((msgs, schema, endpoint) => {
      if (endpoint && endpoint.includes('solver')) return Promise.resolve(mockSolverData);
      if (endpoint && endpoint.includes('critic')) return Promise.resolve(mockCriticData);
      return Promise.resolve({});
    });

    const result = await AiSolverCritic.generateSolverCritic(
      'What is 2+2?',
      'Math',
      'en',
      [{ role: 'user', content: 'What is 2+2?' }],
      undefined,
      'user1'
    );

    // Assert stripped fields
    expect(result.steps).toBeUndefined();
    expect(result.finalEquation).toBeUndefined();
    expect(result.citation).toBeUndefined();
    
    // Assert kept fields
    expect(result.title).toBe('Test');
    expect(result.confidenceScore).toBe(49);
  });

  it('should retain steps, finalEquation, and citation when confidenceScore is 50', async () => {
    const mockSolverData = {
      title: 'Test',
      summary: 'Summary',
      steps: [{ stepNumber: 1, title: 'Step 1', description: 'Desc', mathBlock: null }],
      finalEquation: 'x = 42',
      citation: { textbook: 'Book', chapter: '1', notes: 'Notes', ncertPage: null },
      pipelineLog: { solverDraftSummary: 'Draft', ncertSourceMatch: 'Match' }
    };

    const mockCriticData = {
      criticAuditStatus: 'VERIFIED',
      isOutOfScope: false,
      criticAuditNotes: 'Good job',
      confidenceScore: 50,
      stepVerdicts: [{ stepNumber: 1, verified: true, criticFeedback: null }],
      pipelineLog: { criticVerificationPassed: true, criticWarnings: [] }
    };

    (AiClient.executeWithFallback as jest.Mock).mockImplementation((msgs, schema, endpoint) => {
      if (endpoint && endpoint.includes('solver')) return Promise.resolve(mockSolverData);
      if (endpoint && endpoint.includes('critic')) return Promise.resolve(mockCriticData);
      return Promise.resolve({});
    });

    const result = await AiSolverCritic.generateSolverCritic(
      'What is 2+2?',
      'Math',
      'en',
      [{ role: 'user', content: 'What is 2+2?' }],
      undefined,
      'user1'
    );

    // Assert kept fields
    expect(result.steps).toBeDefined();
    expect(result.steps.length).toBe(1);
    expect(result.finalEquation).toBe('x = 42');
    expect(result.citation).toBeDefined();
    expect(result.confidenceScore).toBe(50);
  });
});
