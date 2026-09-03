const fs = require('fs');
let code = fs.readFileSync('server/services/ai.service.ts', 'utf8');

// Fix in executeWithFallback
code = code.replace(
  'logger.info(`[AI Engine] Attempting generation with Fallback API ${i + 1} (${modelToUse})...`);',
  'const groqModelToUse = "llama-3.1-8b-instant";\n          logger.info(`[AI Engine] Attempting generation with Fallback API ${i + 1} (${groqModelToUse})...`);'
);

code = code.replace(
  'return await this.executeLoop(fallbackClient, modelToUse, messages, jsonSchema, schemaName, userId, endpoint, temperature, onChunk, tools, toolCallback, token);',
  'return await this.executeLoop(fallbackClient, groqModelToUse, messages, jsonSchema, schemaName, userId, endpoint, temperature, onChunk, tools, toolCallback, token);'
);

// Fix in executeStreamWithFallback
code = code.replace(
  'logger.info(`[AI Engine] Attempting stream with Fallback API ${i + 1} (${modelToUse})...`);',
  'const groqModelToUseStream = "llama-3.1-8b-instant";\n          logger.info(`[AI Engine] Attempting stream with Fallback API ${i + 1} (${groqModelToUseStream})...`);'
);

code = code.replace(
  'model: modelToUse,',
  'model: groqModelToUseStream,'
);

fs.writeFileSync('server/services/ai.service.ts', code);
console.log('Fixed fallback model logic.');
