import { Router, Request, Response } from 'express';
import multer from 'multer';
import { ingestDocument } from '../scripts/ingest';
import fs from 'fs';
import crypto from 'crypto';

import path from 'path';

const router = Router();

// Configure multer for file uploads with validation
const upload = multer({ 
  dest: 'server/data/',
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.md' && ext !== '.txt' && ext !== '.pdf') {
      return cb(new Error('Only .md, .txt, and .pdf files are allowed'));
    }
    cb(null, true);
  }
});

// Secure shared-secret protection
const adminAuth = (req: Request, res: Response, next: any) => {
  const providedSecret = req.headers['x-admin-secret'];
  const expectedSecret = process.env.ADMIN_SECRET;

  if (!expectedSecret) {
    return res.status(500).json({ error: 'Server misconfiguration: Admin Secret is not set.' });
  }

  if (!providedSecret || typeof providedSecret !== 'string') {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Admin Secret' });
  }

  const providedBuffer = Buffer.from(providedSecret);
  const expectedBuffer = Buffer.from(expectedSecret);

  if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Admin Secret' });
  }
  
  next();
};
import { adminLimiter } from '../middlewares/rateLimiter';

router.get('/system/health', adminAuth, (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

router.post('/ingest', adminLimiter, adminAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { subject, chapter } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (!subject || !chapter) {
      return res.status(400).json({ error: 'subject and chapter are required fields' });
    }

    const safePath = path.resolve('server/data', path.basename(file.path));

    // Await ingestion
    await ingestDocument(safePath, subject, chapter);

    res.json({ success: true, message: 'Document ingested successfully' });
  } catch (error: any) {
    console.error('Ingestion error:', error);
    res.status(500).json({ error: 'Ingestion failed', details: error.message });
  } finally {
    if (req.file) {
      const safePath = path.resolve('server/data', path.basename(req.file.path));
      if (fs.existsSync(safePath)) {
        try {
          fs.unlinkSync(safePath);
        } catch (e) {
          console.error('Failed to cleanup file:', e);
        }
      }
    }
  }
});

export default router;
