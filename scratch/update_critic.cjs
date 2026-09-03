const fs = require('fs');
let code = fs.readFileSync('server/services/ai.service.ts', 'utf8');

// 1. Add sandbox evaluation logic
const sandboxLogic = `
    let sandboxEvaluation = null;
    if (solverData.finalEquation) {
      sandboxEvaluation = evaluateExpression(solverData.finalEquation);
      if (sandboxEvaluation !== null) {
        logger.info(\`[AI Engine] Sandbox evaluated final equation to: \${sandboxEvaluation}\`);
      }
    }

    const criticMessages`;

code = code.replace(/const criticMessages/, sandboxLogic);

// 2. Add to critic prompt
const criticPromptAppend = `${"${samplesDisagree ? \"\\nWARNING: Multiple independent solver runs produced conflicting final equations. Audit this derivation with EXTREME skepticism. The confidence score should likely be lowered.\" : \"\"}"}
${"${sandboxEvaluation !== null ? `\\n[MATH SANDBOX VERIFICATION]\\nThe deterministic mathematical sandbox evaluated the Solver's final equation and returned: ${sandboxEvaluation}. Verify if the Solver's derivation steps mathematically match this ground-truth calculation.` : `\"\"`}"}
${"${solverData.isSocratic ? `\\n[SOCRATIC MODE]\\nThe Solver has chosen to ask a guiding question rather than provide the full answer:\\nGuiding Question: ${solverData.guidingQuestion}\\nConcept to Master: ${solverData.conceptToMaster}\\nVerify that this question is pedagogically sound and does NOT give away the answer too easily.` : `\"\"`}"}`;

code = code.replace(/\$\{samplesDisagree \? "\\\\nWARNING: Multiple independent solver runs produced conflicting final equations\. Audit this derivation with EXTREME skepticism\. The confidence score should likely be lowered\." : ""\}/, criticPromptAppend);

// 3. Update criticSchema
const newCriticProps = `criticAuditStatus: { type: "string", enum: ["VERIFIED", "FLAGGED"] },
        isSocraticValid: { type: "boolean" },
        socraticFeedback: { type: ["string", "null"] },
        isOutOfScope: { type: "boolean" },`;

code = code.replace(/criticAuditStatus: \{ type: "string", enum: \["VERIFIED", "FLAGGED"\] \},\n\s*isOutOfScope: \{ type: "boolean" \},/, newCriticProps);

fs.writeFileSync('server/services/ai.service.ts', code);
console.log('Critic logic updated');
