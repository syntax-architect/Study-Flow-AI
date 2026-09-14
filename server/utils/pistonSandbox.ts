import { logger } from './logger';

export async function executePython(code: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: 'python',
        version: '3.10.0',
        files: [
          {
            name: 'main.py',
            content: code,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Piston API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.compile && data.compile.code !== 0) {
      return `Compile Error:\n${data.compile.output}`;
    }
    
    if (data.run) {
      if (data.run.code !== 0) {
         return `Runtime Error:\n${data.run.output}`;
      }
      return data.run.output || 'Code executed successfully with no output.';
    }

    return 'Unknown execution error.';
  } catch (err: any) {
    if (err.name === 'AbortError') {
      logger.error('Piston execution timed out after 15 seconds.');
      return 'Execution Failed: Timeout after 15 seconds. The code may contain an infinite loop or take too long to compute.';
    }
    logger.error('Failed to execute Python code via Piston:', err);
    return `Execution Failed: ${err.message}`;
  } finally {
    clearTimeout(timeoutId);
  }
}
