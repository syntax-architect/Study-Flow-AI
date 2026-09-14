export const parsePartialSolverJSON = (jsonString: string) => {
  if (!jsonString) return { title: 'Thinking...', summary: '', steps: [] };

  try {
    return JSON.parse(jsonString);
  } catch (e) {}

  // best effort parser by appending missing brackets
  let str = jsonString;
  const chars = str.split('');
  let inString = false;
  let escape = false;
  const stack: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\') {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (c === '{' || c === '[') {
        stack.push(c);
      } else if (c === '}' || c === ']') {
        stack.pop();
      }
    }
  }

  if (inString) {
    str += '"';
  }

  // Close remaining brackets
  while (stack.length > 0) {
    const bracket = stack.pop();
    str += bracket === '{' ? '}' : ']';
  }

  try {
    return JSON.parse(str);
  } catch (e) {
    // If it still fails, return a safe fallback object
    return {
      title: 'Solving...',
      summary: '',
      steps: [],
    };
  }
};
