import express from 'express';
import request from 'supertest';
import { globalLimiter } from '../../server/middlewares/rateLimiter';

describe('Rate limiter window logic', () => {
  let app: express.Express;

  beforeAll(() => {
    // Mock Date.now to control time
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(globalLimiter);
    app.post('/', (req, res) => {
      res.status(200).send('OK');
    });
  });

  it('should allow requests up to the limit and reject the next, then reset after window', async () => {
    const maxRequests = 500;

    // Simulate N requests within the window
    for (let i = 0; i < maxRequests; i++) {
      const res = await request(app).post('/').send({ userId: 'test_user' });
      expect(res.status).toBe(200);
    }

    // The (N+1)th request should be rejected
    const rejectedRes = await request(app).post('/').send({ userId: 'test_user' });
    expect(rejectedRes.status).toBe(429);
    expect(rejectedRes.body.error).toBe('Too many requests');

    // Simulate time passing past the window (15 minutes + 1 second)
    jest.advanceTimersByTime(15 * 60 * 1000 + 1000);

    // The next request should succeed
    const successRes = await request(app).post('/').send({ userId: 'test_user' });
    expect(successRes.status).toBe(200);
  });
});
