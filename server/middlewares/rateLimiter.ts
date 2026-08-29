import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';

// Intelligent key generator prioritizes authenticated user IDs, then falls back to IP
const intelligentKeyGenerator = (req: Request, res: Response): string => {
  // Use the verified user ID injected by requireAuth middleware
  const verifiedUserId = (req as any).user?.id || req.body?.userId;
  if (verifiedUserId) {
    return `user_${verifiedUserId}`;
  }
  
  // @ts-ignore
  return ipKeyGenerator(req, res);
};

// Global Rate Limiter: Increased to 500 requests per 15 minutes for smooth SPA operation
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false, // Count all requests for the global limiter to prevent DDoS
  keyGenerator: intelligentKeyGenerator,
  message: {
    error: 'Too many requests',
    message: 'You have exceeded your request limit. Please try again later.'
  }
});

// AI endpoints Rate Limiter: Increased to 100 requests per hour
export const solverCriticRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, 
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true, // Don't penalize users if the AI fails or returns 4xx/5xx
  keyGenerator: intelligentKeyGenerator,
  message: {
    error: 'Rate limit exceeded',
    message: 'You have reached the maximum of 100 AI requests per hour.'
  }
});

// Admin endpoints Rate Limiter: 100 requests per hour
export const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: intelligentKeyGenerator,
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many admin requests. Please try again later.'
  }
});
