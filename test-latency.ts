import { config } from 'dotenv';
config();

import { AiService } from './server/services/ai.service';
import { logger } from './server/utils/logger';

async function runTest() {
  const queries = [
    // Novel queries
    { q: 'Solve 3x^2 + 7x - 2 = 0', type: 'Novel' },
    { q: 'Calculate the tension in the rope if mass is 10kg and a=4m/s^2', type: 'Novel' },
    { q: 'What is the derivative of sin(x)*e^x?', type: 'Novel' },
    // Repeat for cache
    { q: 'Solve 3x^2 + 7x - 2 = 0', type: 'Cached' },
    { q: 'What is the derivative of sin(x)*e^x?', type: 'Cached' },
    // Semantic similar
    { q: 'Solve 3x^2+7x-2=0', type: 'Semantic' },
    { q: 'Find derivative for sin(x)*e^x', type: 'Semantic' }
  ];

  const results: Record<string, number[]> = {
    'Novel': [],
    'Cached': [],
    'Semantic': []
  };

  console.log('Running tests...');
  for (const item of queries) {
    const start = Date.now();
    try {
      await AiService.generateSolverCritic(item.q, 'Math/Physics', 'en', [], undefined, 'test_user_id');
      const time = Date.now() - start;
      console.log(`[${item.type}] Query: "${item.q}" -> ${time}ms`);
      results[item.type].push(time);
    } catch (e: unknown) {
      console.error(`Error on "${item.q}":`, (e as Error).message);
    }
  }

  function stats(arr: number[]) {
    if (arr.length === 0) return 'N/A';
    arr.sort((a,b) => a-b);
    const min = arr[0];
    const max = arr[arr.length-1];
    const median = arr[Math.floor(arr.length/2)];
    return `Min: ${min}ms | Median: ${median}ms | Max: ${max}ms`;
  }

  console.log('\\n--- LATENCY REPORT ---');
  for (const type of ['Novel', 'Cached', 'Semantic']) {
    console.log(`${type}: ${stats(results[type])}`);
  }
}

runTest();
