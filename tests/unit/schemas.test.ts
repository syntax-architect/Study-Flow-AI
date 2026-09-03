import Ajv from 'ajv';
import { getSolverSchema, getCriticSchema } from '../../server/services/ai/schemas';

const ajv = new Ajv();

describe('Structured output schema validation', () => {
  describe('SolverResult Schema', () => {
    const validate = ajv.compile(getSolverSchema());

    it('should accept a valid object', () => {
      const validObj = {
        title: "Test",
        summary: "Summary",
        steps: [
          {
            stepNumber: 1,
            title: "Step 1",
            description: "Desc",
            mathBlock: null
          }
        ],
        finalEquation: "x = 2",
        suggestedFollowUps: [],
        explanationComplexity: "Standard",
        citation: {
          textbook: "Book",
          chapter: "1",
          notes: "Note",
          ncertPage: "10"
        },
        pipelineLog: {
          solverDraftSummary: "Draft",
          ncertSourceMatch: "Match"
        }
      };
      
      const isValid = validate(validObj);
      if (!isValid) console.log(validate.errors);
      expect(isValid).toBe(true);
    });

    it('should reject a deliberately malformed object (missing required field)', () => {
      const invalidObj = {
        title: "Test",
        summary: "Summary",
        steps: [],
        // Missing finalEquation
        citation: {
          textbook: "Book",
          chapter: "1",
          notes: "Note",
          ncertPage: "10"
        },
        pipelineLog: {
          solverDraftSummary: "Draft",
          ncertSourceMatch: "Match"
        }
      };
      
      const isValid = validate(invalidObj);
      expect(isValid).toBe(false);
    });

    it('should reject a deliberately malformed object (wrong type)', () => {
      const invalidObj = {
        title: "Test",
        summary: "Summary",
        steps: [],
        finalEquation: 123, // Should be string
        citation: {
          textbook: "Book",
          chapter: "1",
          notes: "Note",
          ncertPage: "10"
        },
        pipelineLog: {
          solverDraftSummary: "Draft",
          ncertSourceMatch: "Match"
        }
      };
      
      const isValid = validate(invalidObj);
      expect(isValid).toBe(false);
    });
  });

  describe('CriticResult Schema', () => {
    const validate = ajv.compile(getCriticSchema());

    it('should accept a valid object', () => {
      const validObj = {
        criticAuditStatus: "VERIFIED",
        isOutOfScope: false,
        newInsights: [],
        criticAuditNotes: "Notes",
        confidenceScore: 85,
        studentMastery: false,
        stepVerdicts: [
          {
            stepNumber: 1,
            verified: true,
            criticFeedback: null
          }
        ],
        pipelineLog: {
          criticVerificationPassed: true,
          criticWarnings: []
        }
      };
      
      const isValid = validate(validObj);
      if (!isValid) console.log(validate.errors);
      expect(isValid).toBe(true);
    });

    it('should reject a deliberately malformed object (missing required field)', () => {
      const invalidObj = {
        criticAuditStatus: "VERIFIED",
        isOutOfScope: false,
        // Missing criticAuditNotes
        confidenceScore: 85,
        stepVerdicts: [],
        pipelineLog: {
          criticVerificationPassed: true,
          criticWarnings: []
        }
      };
      
      const isValid = validate(invalidObj);
      expect(isValid).toBe(false);
    });
  });
});
