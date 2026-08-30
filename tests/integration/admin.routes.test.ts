/** @jest-environment node */
const request = require('supertest');
const express = require('express');
import adminRoutes from '../../server/routes/admin.routes';
import { globalLimiter } from '../../server/middlewares/rateLimiter';

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use(globalLimiter);
app.use('/api/admin', adminRoutes);

jest.mock('../../server/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ error: null, data: [] })
  }
}));

describe('Admin Routes', () => {
  const adminSecret = process.env.ADMIN_SECRET || 'secret';

  beforeAll(() => {
    process.env.ADMIN_SECRET = adminSecret;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should block requests without an authorization header', async () => {
    const response = await request(app).get('/api/admin/system/health');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized: Missing or invalid Admin Secret');
  });

  it('should block requests with incorrect secret', async () => {
    const response = await request(app)
      .get('/api/admin/system/health')
      .set('x-admin-secret', 'wrong_secret');
    expect(response.status).toBe(401);
  });

  it('should allow requests with correct secret', async () => {
    const response = await request(app)
      .get('/api/admin/system/health')
      .set('x-admin-secret', adminSecret);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'healthy');
  });
});
