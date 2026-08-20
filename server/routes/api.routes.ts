import { Router } from 'express';
import { handleSolverCritic, handleAuditTopic, handleChatStream } from '../controllers/ai.controller';
import { getHealth } from '../controllers/health.controller';
import dbRoutes from './db.routes';

import adminRoutes from './admin.routes';

import { solverCriticRateLimiter } from '../middlewares/rateLimiter';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.get('/health', getHealth);
router.post('/solver-critic', requireAuth, solverCriticRateLimiter, handleSolverCritic);
router.post('/audit-topic', requireAuth, solverCriticRateLimiter, handleAuditTopic);
router.post('/chat-stream', requireAuth, solverCriticRateLimiter, handleChatStream);
router.use('/db', requireAuth, dbRoutes);
router.use('/admin', adminRoutes);

export default router;
