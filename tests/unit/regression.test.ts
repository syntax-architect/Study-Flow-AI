/** @jest-environment node */
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import express from 'express';

// Mock AiService before importing controller
jest.mock('../../server/services/ai.service', () => ({
  AiService: {
    generateSolverCritic: jest.fn().mockImplementation(async (query: string) => {
      if (query === 'conversation') {
        return { isConversation: true, content: 'Hello' };
      }
      return { 
        isConversation: false, 
        criticAuditStatus: 'VERIFIED',
        citation: { chapter: 'Regression Chapter' },
        steps: []
      };
    })
  }
}));

// Mock Supabase
const mockRpc = jest.fn().mockResolvedValue({ error: null });
jest.mock('../../server/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ error: null }),
    rpc: mockRpc
  },
  getAuthSupabase: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ error: null }),
    rpc: mockRpc
  })
}));

// Import after mocking
import { handleSolverCritic } from '../../server/controllers/ai.controller';

const app = express();
app.use(express.json());
app.post('/api/solver', handleSolverCritic);

describe('Regression Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. should correctly identify Devanagari characters in Hindi text', () => {
    const hindiRegex = /[\u0900-\u097F]/;
    expect(hindiRegex.test("नमस्ते")).toBe(true);
    expect(hindiRegex.test("Hello world")).toBe(false);
  });

  it('2. should correctly identify digits in short physics queries for routing', () => {
    const query = "F=5N, find a";
    const casualGreetings = ['hello', 'hi', 'hey'];
    const normalizedQuery = query.toLowerCase().trim();
    
    // Simulate intent logic from AiService
    const isGreeting = casualGreetings.some(g => normalizedQuery.includes(g));
    const containsDigit = /\d/.test(normalizedQuery);
    const isShortAndNoDigit = normalizedQuery.length < 20 && !containsDigit;
    
    expect(isGreeting).toBe(false);
    expect(containsDigit).toBe(true);
    expect(isShortAndNoDigit).toBe(false);
  });

  it('3. should normalize equations by stripping all whitespace for self-consistency', () => {
    const clean = (s: string) => s.replace(/\s+/g, '').toLowerCase();
    
    const eq1 = "F = ma";
    const eq2 = "F=ma";
    const eq3 = "  f = m a  ";
    
    expect(clean(eq1)).toBe(clean(eq2));
    expect(clean(eq1)).toBe(clean(eq3));
  });

  it('4. should never trigger mastery upsert when isConversation is true', async () => {
    // Test with isConversation = true
    await request(app)
      .post('/api/solver')
      .send({ query: 'conversation', userId: 'user_123', chatId: 'chat_123' })
      .expect(200);
      
    expect(mockRpc).not.toHaveBeenCalledWith('upsert_topic_mastery', expect.anything());

    mockRpc.mockClear();

    // Test with isConversation = false
    await request(app)
      .post('/api/solver')
      .send({ query: 'academic', userId: 'user_123', chatId: 'chat_123' })
      .expect(200);

    expect(mockRpc).toHaveBeenCalledWith('upsert_topic_mastery', expect.objectContaining({
      p_topic_title: 'Regression Chapter'
    }));
  });

  it('5. should have matching environment variables in env.ts and .env.example', () => {
    const envTsPath = path.resolve(__dirname, '../../server/config/env.ts');
    const envExamplePath = path.resolve(__dirname, '../../.env.example');
    
    const envTsContent = fs.readFileSync(envTsPath, 'utf8');
    const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
    
    const envTsVars = new Set<string>();
    const regex = /process\.env\.([A-Z0-9_]+)/g;
    let match;
    while ((match = regex.exec(envTsContent)) !== null) {
      envTsVars.add(match[1]);
    }
    
    const envExampleVars = new Set<string>();
    const lines = envExampleContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const key = trimmed.split('=')[0];
        if (key) {
          envExampleVars.add(key);
        }
      }
    }
    
    const missingInExample = [...envTsVars].filter(x => !envExampleVars.has(x));
    const missingInEnvTs = [...envExampleVars].filter(x => !envTsVars.has(x));
    
    expect(missingInExample).toEqual([]);
    expect(missingInEnvTs).toEqual([]);
  });
});
