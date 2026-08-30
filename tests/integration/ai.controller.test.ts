/** @jest-environment node */
const request = require('supertest');
const express = require('express');
import { handleChatStream } from '../../server/controllers/ai.controller';
import { solverCriticRateLimiter } from '../../server/middlewares/rateLimiter';

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.post('/api/chat-stream', solverCriticRateLimiter, handleChatStream);

// Mock the AI service
jest.mock('../../server/services/ai.service', () => ({
  AiService: {
    streamChat: jest.fn().mockImplementation(async function* (messages, systemInstruction, filter) {
      yield { choices: [{ delta: { content: '{"message": "Hello"}' } }] };
      yield { choices: [{ delta: { content: '{"message": " World"}' } }] };
    })
  }
}));

describe('AI Controller - Stream', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if messages are missing', async () => {
    const response = await request(app)
      .post('/api/chat-stream')
      .send({ userId: process.env.TEST_USER_ID || 'mocked_user_id' });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('messages array cannot be empty');
  });

  it('should stream data correctly', async () => {
    const response = await request(app)
      .post('/api/chat-stream')
      .send({ messages: [{ role: 'user', content: 'Hi' }], userId: process.env.TEST_USER_ID || 'mocked_user_id' })
      .expect('Content-Type', /text\/event-stream/);

    expect(response.status).toBe(200);
    expect(response.text).toContain('data: {"content":"{\\"message\\": \\"Hello\\"}"}');
    expect(response.text).toContain('data: {"content":"{\\"message\\": \\" World\\"}"}');
    expect(response.text).toContain('data: [DONE]');
  });
});
