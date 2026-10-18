import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';

export const isGeminiConfigured = Boolean(apiKey && apiKey.trim().length > 0 && apiKey !== 'MY_GEMINI_API_KEY');

export const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export function parseDataUrl(dataUrl: string): { mimeType: string; base64Data: string } {
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!matches || matches.length < 3) {
    // Fallback assumption
    return {
      mimeType: 'image/jpeg',
      base64Data: dataUrl.replace(/^data:image\/[a-zA-Z]+;base64,/, '')
    };
  }
  return {
    mimeType: matches[1],
    base64Data: matches[2]
  };
}
