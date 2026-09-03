const fs = require('fs');
let code = fs.readFileSync('server/services/ai.service.ts', 'utf8');

// 1. Update solverSchema
const solverSchemaSearch = `      required: ["status", "solverAuditStatus", "solverAuditNotes", "isSocratic", "steps", "finalEquation", "citation"],`;
const solverSchemaReplace = `      required: ["status", "solverAuditStatus", "solverAuditNotes", "isSocratic", "steps", "finalEquation", "citation", "suggestedFollowUps", "explanationComplexity"],`;

if (code.includes(solverSchemaSearch)) {
    code = code.replace(solverSchemaSearch, solverSchemaReplace);
}

const solverPropsSearch = `        finalEquation: { type: "string" },`;
const solverPropsReplace = `        finalEquation: { type: "string" },
        suggestedFollowUps: { type: "array", items: { type: "string" }, description: "3 short, clickable questions the user can ask next to continue." },
        explanationComplexity: { type: "string", enum: ["ELI5", "Standard", "Advanced"], description: "The complexity of vocabulary used." },`;

if (code.includes(solverPropsSearch)) {
    code = code.replace(solverPropsSearch, solverPropsReplace);
}

// 2. Update criticSchema
const criticSchemaSearch = `      required: ["isOutOfScope", "criticAuditStatus", "criticAuditNotes", "confidenceScore", "stepVerdicts"],`;
const criticSchemaReplace = `      required: ["isOutOfScope", "criticAuditStatus", "criticAuditNotes", "confidenceScore", "stepVerdicts", "studentMastery"],`;

if (code.includes(criticSchemaSearch)) {
    code = code.replace(criticSchemaSearch, criticSchemaReplace);
}

const criticPropsSearch = `        confidenceScore: { type: "integer" },`;
const criticPropsReplace = `        confidenceScore: { type: "integer" },
        studentMastery: { type: "boolean", description: "True if the student finally grasps a hard concept (lightbulb moment)." },`;

if (code.includes(criticPropsSearch)) {
    code = code.replace(criticPropsSearch, criticPropsReplace);
}

// 3. Update MASTER_SYSTEM_PROMPT
const promptSearch = `### CORE PEDAGOGY: SOCRATIC METHOD & FIRST PRINCIPLES`;
const promptReplace = `### CORE PEDAGOGY: SOCRATIC METHOD & FIRST PRINCIPLES
- **Adaptive Explanations**: If the student is struggling, switch your vocabulary to 'ELI5' (Explain Like I'm 5) and use very simple real-world analogies.`;

if (code.includes(promptSearch) && !code.includes('Adaptive Explanations')) {
    code = code.replace(promptSearch, promptReplace);
}

// 4. Also need to ensure finalResponse merges the new fields
const finalResponseSearch = `      isOutOfScope: finalCriticData.isOutOfScope,
      criticAuditNotes: finalCriticData.criticAuditNotes,
      confidenceScore: finalCriticData.confidenceScore,
      stepVerdicts: finalCriticData.stepVerdicts,`;
const finalResponseReplace = `      isOutOfScope: finalCriticData.isOutOfScope,
      criticAuditNotes: finalCriticData.criticAuditNotes,
      confidenceScore: finalCriticData.confidenceScore,
      stepVerdicts: finalCriticData.stepVerdicts,
      studentMastery: finalCriticData.studentMastery,
      suggestedFollowUps: finalSolverData.suggestedFollowUps,
      explanationComplexity: finalSolverData.explanationComplexity,`;

if (code.includes(finalResponseSearch)) {
    code = code.replace(finalResponseSearch, finalResponseReplace);
}

fs.writeFileSync('server/services/ai.service.ts', code);
console.log('Schemas updated.');
