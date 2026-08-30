import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import { config } from './server/config/env';
import apiRoutes from './server/routes/api.routes';
import { errorHandler } from './server/middlewares/errorHandler';
import { globalLimiter } from './server/middlewares/rateLimiter';

async function startServer() {
  const app = express();
  
  // Trust proxy if behind a load balancer (e.g., Vercel, Nginx)
  app.set('trust proxy', 1);

  // Security HTTP headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.clerk.accounts.dev", "https://*.clerk.com", "https://challenges.cloudflare.com", "https://loving-owl-6233.clerk.accounts.dev"],
        connectSrc: ["'self'", "ws:", "wss:", "https://*.clerk.accounts.dev", "https://*.clerk.com", "https://challenges.cloudflare.com", "https://clerk-telemetry.com", "https://loving-owl-6233.clerk.accounts.dev"],
        imgSrc: ["'self'", "data:", "blob:", "https://*.clerk.com", "https://img.clerk.com"],
        workerSrc: ["'self'", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        frameSrc: ["'self'", "https://*.clerk.accounts.dev", "https://*.clerk.com", "https://challenges.cloudflare.com", "https://loving-owl-6233.clerk.accounts.dev"],
        upgradeInsecureRequests: null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // Enable CORS securely
  app.use(cors({
    origin: config.nodeEnv === 'production' ? config.appUrl : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  }));

  // Body parser
  app.use(express.json({ limit: '1mb' }));

  // Protect against HTTP Parameter Pollution
  app.use(hpp());

  // Mount API Routes with Rate Limiting
  app.use('/api', globalLimiter, apiRoutes);

  // Vite middleware in dev mode
  if (config.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    const indexPath = path.join(distPath, 'index.html');
    app.get('*', globalLimiter, (req, res) => {
      res.sendFile(indexPath);
    });
  }

  // Global Error Handler (must be after routes)
  app.use(errorHandler);

  app.listen(config.port, '::', () => {
    console.log(`StudyFlow AI server listening on port ${config.port}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
