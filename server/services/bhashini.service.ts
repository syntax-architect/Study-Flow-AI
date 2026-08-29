import OpenAI from 'openai';
import { config } from '../config/env';
import fs from 'fs';

export class BhashiniService {
  private static getOpenAIClient() {
    if (!config.primaryAiApiKey) {
      throw new Error('Missing Primary AI API Key for Bhashini fallback');
    }
    return new OpenAI({
      apiKey: config.primaryAiApiKey,
      baseURL: config.primaryAiBaseUrl,
    });
  }

  // Translates text from source language to target language
  static async translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
    if (process.env.BHASHINI_API_KEY) {
      // TODO: Implement actual Bhashini NMT API call here when keys are available.
      // E.g., fetch('https://dhruva-api.bhashini.gov.in/services/inference/pipeline', ...)
    }

    // Fallback to OpenAI
    const client = this.getOpenAIClient();
    const response = await client.chat.completions.create({
      model: config.primaryAiModel || 'gpt-4o',
      messages: [
        { role: 'system', content: `You are an expert translator. Translate the following text from ${sourceLang} to ${targetLang}. Preserve all formatting, math equations (in $...$ or $$...$$), and markdown. ONLY return the translated text without any conversational filler.` },
        { role: 'user', content: text }
      ]
    });

    return response.choices[0]?.message?.content || text;
  }

  // Transcribes audio file to text in the given source language
  static async transcribeAudio(audioFilePath: string, sourceLang: string = 'en'): Promise<string> {
    if (process.env.BHASHINI_API_KEY) {
      // TODO: Implement actual Bhashini ASR API call here when keys are available.
    }

    // Fallback to OpenAI Whisper
    const client = this.getOpenAIClient();
    
    // Whisper supports 'language' parameter in ISO-639-1 format
    // Map our lang codes if necessary (bhashini uses slightly different sometimes, but en, hi, ta, mr are standard)
    const whisperLang = sourceLang === 'bn' ? 'bn' : (sourceLang || 'en');

    const response = await client.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: 'whisper-1',
      language: whisperLang,
    });

    return response.text;
  }

  // Generates speech audio from text in the target language
  // Returns audio buffer
  static async textToSpeech(text: string, targetLang: string = 'en'): Promise<Buffer> {
    if (process.env.BHASHINI_API_KEY) {
      // TODO: Implement actual Bhashini TTS API call here when keys are available.
    }

    // Fallback to OpenAI TTS
    const client = this.getOpenAIClient();
    
    // Strip markdown and math for better TTS reading
    const cleanText = text
      .replace(/\\\[(.*?)\\\]/g, ' $1 ') // Block math
      .replace(/\\\((.*?)\\\)/g, ' $1 ') // Inline math
      .replace(/\$\$(.*?)\$\$/g, ' $1 ')
      .replace(/\$(.*?)\$/g, ' $1 ')
      .replace(/[*_~`#]/g, '') // Remove markdown formatting chars
      .trim()
      .substring(0, 4096); // OpenAI TTS character limit

    const response = await client.audio.speech.create({
      model: 'tts-1',
      voice: targetLang === 'hi' || targetLang === 'bn' ? 'alloy' : 'nova', // Alloy works okay for multi-lang sometimes, but OpenAI TTS supports multiple languages natively.
      input: cleanText,
      response_format: 'mp3',
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer;
  }
}
