import { Router } from 'express';
import { handleSolverCritic, handleAuditTopic, handleChatStream, handleStudyRoomModerate } from '../controllers/ai.controller';
import { getHealth } from '../controllers/health.controller';
import dbRoutes from './db.routes';

import adminRoutes from './admin.routes';

import { solverCriticRateLimiter } from '../middlewares/rateLimiter';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.get('/health', getHealth);
import { getPublicTrustStats, submitWaitlist } from '../controllers/db.controller';
router.get('/trust-stats', getPublicTrustStats);
router.post('/waitlist', submitWaitlist);

router.post('/solver-critic', requireAuth, solverCriticRateLimiter, handleSolverCritic);
router.post('/audit-topic', requireAuth, solverCriticRateLimiter, handleAuditTopic);
router.post('/chat-stream', requireAuth, solverCriticRateLimiter, handleChatStream);
router.post('/ai/moderate', requireAuth, solverCriticRateLimiter, handleStudyRoomModerate);

import multer from 'multer';
import os from 'os';
import path from 'path';
import { handleVisionOCR, handleVoiceTranscribe, handleTextToSpeech } from '../controllers/ai.controller';
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpeg', '.jpg', '.png', '.webp'].includes(ext) || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only standard image files are allowed'));
    }
    cb(null, true);
  }
});
const diskUpload = multer({ 
  dest: os.tmpdir(), 
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.mp3', '.wav', '.webm', '.m4a', '.mp4'].includes(ext) || !file.mimetype.startsWith('audio/') && !file.mimetype.startsWith('video/')) {
      return cb(new Error('Only standard audio/video files are allowed'));
    }
    cb(null, true);
  }
});

import { fileTypeFromBuffer, fileTypeFromFile } from 'file-type';
import fs from 'fs';

const validateImageUpload = async (req: any, res: any, next: any) => {
  if (!req.file) return next();
  try {
    const type = await fileTypeFromBuffer(req.file.buffer);
    if (!type || !type.mime.startsWith('image/')) {
      return res.status(400).json({ error: 'Invalid file type. Only real images are allowed.' });
    }
    next();
  } catch (err) {
    next(err);
  }
};

const validateAudioUpload = async (req: any, res: any, next: any) => {
  if (!req.file) return next();
  try {
    const safePath = path.resolve(os.tmpdir(), path.basename(req.file.path));
    const type = await fileTypeFromFile(safePath);
    if (!type || (!type.mime.startsWith('audio/') && !type.mime.startsWith('video/'))) {
      fs.unlink(safePath, () => {});
      return res.status(400).json({ error: 'Invalid file type. Only real audio/video files are allowed.' });
    }
    next();
  } catch (err) {
    const safePath = path.resolve(os.tmpdir(), path.basename(req.file.path));
    fs.unlink(safePath, () => {});
    next(err);
  }
};

router.post('/vision-ocr', requireAuth, solverCriticRateLimiter, upload.single('image'), validateImageUpload, handleVisionOCR);
router.post('/voice-transcribe', requireAuth, solverCriticRateLimiter, diskUpload.single('audio'), validateAudioUpload, handleVoiceTranscribe);
router.post('/text-to-speech', requireAuth, solverCriticRateLimiter, handleTextToSpeech);
router.use('/db', requireAuth, dbRoutes);
router.use('/admin', adminRoutes);

export default router;
