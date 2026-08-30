/** @jest-environment node */
const request = require('supertest');
const express = require('express');
import dbRoutes from '../../server/routes/db.routes';
import { globalLimiter } from '../../server/middlewares/rateLimiter';

// Set up a mock Express app for testing
const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use(globalLimiter);
app.use('/api/db', dbRoutes);

// Mock the Supabase client
jest.mock('../../server/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error: null })
  },
  getAuthSupabase: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error: null, data: [] })
  })
}));

describe('Database API Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully execute batch delete of user chats', async () => {
    const userId = process.env.TEST_USER_ID || 'mocked_user_id';
    // We send an authorization header to simulate authenticated batch delete
    const response = await request(app)
      .delete(`/api/db/chats/user/${userId}`)
      .set('Authorization', process.env.TEST_TOKEN || 'Bearer mock_token_123');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });

  it('should reject flag-for-review if question or userId is missing', async () => {
    // Missing question
    const response = await request(app)
      .post('/api/db/flag-for-review')
      .send({ userId: process.env.TEST_USER_ID || 'mocked_user_id', chatId: 'chat_123' })
      .set('Authorization', process.env.TEST_TOKEN || 'Bearer mock_token_123');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'userId and question are required');
  });

  it('should succeed flag-for-review if valid data provided', async () => {
    const response = await request(app)
      .post('/api/db/flag-for-review')
      .send({ userId: process.env.TEST_USER_ID || 'mocked_user_id', chatId: 'chat_123', question: 'Test question', criticNotes: 'Test notes' })
      .set('Authorization', process.env.TEST_TOKEN || 'Bearer mock_token_123');

    expect(response.status).toBe(200);
  });
});
