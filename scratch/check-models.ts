import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.PRIMARY_AI_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

async function main() {
  const models = await client.models.list();
  console.log(models.data.map(m => m.id));
}
main();
