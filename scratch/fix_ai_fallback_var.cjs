const fs = require('fs');
let code = fs.readFileSync('server/services/ai.service.ts', 'utf8');

code = code.replace(
  'model: groqModelToUseStream,',
  'model: modelToUse,'
);

code = code.replace(
  'const stream = await fallbackClient.chat.completions.create({\n            model: modelToUse,\n            messages,',
  'const stream = await fallbackClient.chat.completions.create({\n            model: groqModelToUseStream,\n            messages,'
);

fs.writeFileSync('server/services/ai.service.ts', code);
console.log('Fixed variable.');
