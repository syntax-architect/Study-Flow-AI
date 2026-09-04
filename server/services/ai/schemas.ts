export const getSolverSchema = () => ({
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          stepNumber: { type: "integer" },
          title: { type: "string" },
          description: { type: "string" },
          mathBlock: { type: ["string", "null"] }
        },
        required: ["stepNumber", "title", "description", "mathBlock"],
        additionalProperties: false
      }
    },
    finalEquation: { type: "string" },
    suggestedFollowUps: { type: "array", items: { type: "string" }, description: "3 short, clickable questions the user can ask next to continue." },
    explanationComplexity: { type: "string", enum: ["ELI5", "Standard", "Advanced"], description: "The complexity of vocabulary used." },
    citation: {
      type: "object",
      properties: {
        textbook: { type: "string" },
        chapter: { type: "string" },
        notes: { type: "string" },
        ncertPage: { type: ["string", "null"] }
      },
      required: ["textbook", "chapter", "notes", "ncertPage"],
      additionalProperties: false
    },
    pipelineLog: {
      type: "object",
      properties: {
        solverDraftSummary: { type: "string" },
        ncertSourceMatch: { type: "string" }
      },
      required: ["solverDraftSummary", "ncertSourceMatch"],
      additionalProperties: false
    }
  },
  required: ["title", "summary", "steps", "finalEquation", "suggestedFollowUps", "explanationComplexity", "citation", "pipelineLog"],
  additionalProperties: false
});

export const getCriticSchema = () => ({
  type: "object",
  properties: {
    criticAuditStatus: { type: "string", enum: ["VERIFIED", "FLAGGED"] },
    isOutOfScope: { type: "boolean" },
    newInsights: { type: "array", items: { type: "string" }, description: "Optional. 1-2 sentence insights about the student's conceptual weakness or mastery based on their query. Only output if a clear pattern or gap is spotted." },
    criticAuditNotes: { type: "string" },
    confidenceScore: { type: "integer" },
    studentMastery: { type: "boolean", description: "True if the student finally grasps a hard concept (lightbulb moment)." },
    stepVerdicts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          stepNumber: { type: "integer" },
          verified: { type: "boolean" },
          criticFeedback: { type: ["string", "null"] }
        },
        required: ["stepNumber", "verified", "criticFeedback"],
        additionalProperties: false
      }
    },
    pipelineLog: {
      type: "object",
      properties: {
        criticVerificationPassed: { type: "boolean" },
        criticWarnings: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["criticVerificationPassed", "criticWarnings"],
      additionalProperties: false
    }
  },
  required: ["criticAuditStatus", "isOutOfScope", "newInsights", "criticAuditNotes", "confidenceScore", "studentMastery", "stepVerdicts", "pipelineLog"],
  additionalProperties: false
});

export const getCriticTools = (evaluateExpression: any) => [
  {
    type: "function",
    function: {
      name: "evaluate_expression",
      description: "Evaluate an arithmetic or algebraic expression (e.g. '15 * 42', 'sin(45 deg)'). Returns the mathematical result.",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string" }
        },
        required: ["expression"],
        additionalProperties: false
      },
      strict: true
    }
  }
];

export const getSolverTools = () => [
  {
    type: "function",
    function: {
      name: "execute_javascript",
      description: "Execute a block of javascript code in a secure sandbox to calculate physics/math simulations or solve equations. Return the result via console.log. Example code: `console.log(15 * 42)`",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string" }
        },
        required: ["code"],
        additionalProperties: false
      },
      strict: true
    }
  }
];

export const getExpansionSchema = () => ({
  type: "object",
  properties: {
    queries: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["queries"],
  additionalProperties: false
});

export const getRerankSchema = () => ({
  type: "object",
  properties: {
    scoredExcerpts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          excerptIndex: { type: "integer" },
          score: { type: "integer" }
        },
        required: ["excerptIndex", "score"],
        additionalProperties: false
      }
    }
  },
  required: ["scoredExcerpts"],
  additionalProperties: false
});
