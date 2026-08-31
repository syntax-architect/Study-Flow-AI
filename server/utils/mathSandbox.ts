import { evaluate } from 'mathjs';
import { logger } from './logger';

export function evaluateExpression(expr: string, context: Record<string, any> = {}): number | string | boolean | null {
  try {
    // Remove equality if it's an equation like x = 5 (we evaluate the RHS if it's simple)
    // Or we just evaluate simple numeric/algebraic expressions provided by the AI.
    let cleanExpr = expr.trim();
    
    // If it's an equation (e.g. "x = 5"), we can't easily "evaluate" it to a number without solving.
    // This sandbox is primarily for arithmetic verification or evaluating the right side.
    if (cleanExpr.includes('=')) {
      const parts = cleanExpr.split('=');
      cleanExpr = parts[1].trim(); // evaluate the right hand side
    }

    const result = evaluate(cleanExpr, context);
    
    // Check if result is a number or can be converted to one easily
    if (typeof result === 'number' || typeof result === 'boolean') {
      return result;
    }
    
    return result.toString();
  } catch (error: any) {
    logger.warn(`mathSandbox failed to evaluate expression: "${expr}". Error: ${error.message}`);
    return null; // Return null if it cannot be evaluated (e.g., complex un-parseable algebra)
  }
}
