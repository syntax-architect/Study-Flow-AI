import vm from 'vm';
import { logger } from './logger';
import * as mathjs from 'mathjs';

export function executeJavascript(code: string): string {
  try {
    const sandbox: Record<string, any> = {
      console: {
        log: (...args: any[]) => {
          sandbox.output += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n';
        }
      },
      output: '',
      Math: Math,
      math: mathjs,
    };

    const context = vm.createContext(sandbox);
    const script = new vm.Script(code);
    
    // Execute with a strict timeout to prevent infinite loops
    script.runInContext(context, { timeout: 2000 });
    
    return sandbox.output.trim() || 'No output. Did you console.log the result?';
  } catch (error: any) {
    logger.warn(`codeSandbox failed to evaluate code. Error: ${error.message}`);
    return `Error: ${error.message}`;
  }
}
