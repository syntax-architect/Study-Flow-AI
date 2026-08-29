import { Router } from 'express';
import { handleSolverCritic, handleAuditTopic, handleChatStream } from '../controllers/ai.controller';
import { getHealth } from '../controllers/health.controller';
import dbRoutes from './db.routes';

import adminRoutes from './admin.routes';

import { solverCriticRateLimiter } from '../middlewares/rateLimiter';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.get('/health', getHealth);
import { getPublicTrustStats } from '../controllers/db.controller';
router.get('/trust-stats', getPublicTrustStats);

router.post('/solver-critic', requireAuth, solverCriticRateLimiter, handleSolverCritic);
router.post('/audit-topic', requireAuth, solverCriticRateLimiter, handleAuditTopic);
router.post('/chat-stream', requireAuth, solverCriticRateLimiter, handleChatStream);

import multer from 'multer';
import os from 'os';
import { handleVisionOCR, handleVoiceTranscribe } from '../controllers/ai.controller';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const diskUpload = multer({ dest: os.tmpdir(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/vision-ocr', requireAuth, solverCriticRateLimiter, upload.single('image'), handleVisionOCR);
router.post('/voice-transcribe', requireAuth, solverCriticRateLimiter, diskUpload.single('audio'), handleVoiceTranscribe);
router.use('/db', requireAuth, dbRoutes);
router.use('/admin', adminRoutes);

export default router;
