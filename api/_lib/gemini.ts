import { GoogleGenAI } from '@google/genai';

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const IMAGE_MODEL = 'gemini-3-pro-image-preview';
