const fs = require('fs');
let code = fs.readFileSync('server/services/ai.service.ts', 'utf8');

// 1. Add logger and mathSandbox imports
if (!code.includes('import { logger }')) {
  code = code.replace(/import \{ appCache \} from '..\/utils\/cache';/, "import { appCache } from '../utils/cache';\nimport { logger } from '../utils/logger';\nimport { evaluateExpression } from '../utils/mathSandbox';");
}

// 2. Replace console.log with logger
code = code.replace(/console\.error/g, 'logger.error');
code = code.replace(/console\.warn/g, 'logger.warn');
code = code.replace(/console\.log\(`\[AI Engine\] RAG Multi-Query/g, 'logger.debug(`[AI Engine] RAG Multi-Query');
code = code.replace(/console\.log\('\[AI Engine\] Synthesizing/g, "logger.debug('[AI Engine] Synthesizing");
code = code.replace(/console\.log\('\[AI Engine\] Generated Query/g, "logger.debug('[AI Engine] Generated Query");
code = code.replace(/console\.log\('\[AI Engine\] Routing intent/g, "logger.debug('[AI Engine] Routing intent");
code = code.replace(/console\.log\('\[AI Engine\] Intent routed/g, "logger.debug('[AI Engine] Intent routed");
code = code.replace(/console\.log\('\[AI Engine\] Novel query/g, "logger.debug('[AI Engine] Novel query");
code = code.replace(/console\.log\('\[AI Engine\] Finalizing pipeline/g, "logger.debug('[AI Engine] Finalizing pipeline");
// For any remaining console.log
code = code.replace(/console\.log\(/g, 'logger.info(');


// 3. Socratic Mode Prompts
code = code.replace('### CORE PEDAGOGY: FIRST PRINCIPLES THINKING', 
`### CORE PEDAGOGY: SOCRATIC METHOD & FIRST PRINCIPLES
- **Socratic Mode by Default**: Do NOT provide the complete solution upfront unless explicitly requested. Analyze the user's input, identify the missing conceptual link, and ask a guiding question to lead them to the next step.
- Never skip algebraic steps or assume the student "just knows" a formula.`);
code = code.replace('- Never skip algebraic steps or assume the student "just knows" a formula.\n', '');

// 4. solverSchema modification
code = code.replace(/title: \{ type: "string" \},\n\s*summary: \{ type: "string" \},/,
  'isSocratic: { type: "boolean" },\n        guidingQuestion: { type: ["string", "null"] },\n        conceptToMaster: { type: ["string", "null"] },\n        title: { type: ["string", "null"] },\n        summary: { type: ["string", "null"] },');
code = code.replace(/required: \["title", "summary", "steps", "finalEquation", "citation", "pipelineLog"\],/, 
  'required: ["isSocratic", "citation", "pipelineLog"],');

fs.writeFileSync('server/services/ai.service.ts', code);
console.log('Modifications applied');
