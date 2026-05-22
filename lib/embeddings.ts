import OpenAI from 'openai';
import { env } from './env';

let openaiInstance: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = env.OPENAI_API_KEY || 'dummy-api-key';
    openaiInstance = new OpenAI({
      apiKey: apiKey,
    });
  }
  return openaiInstance;
}

export async function getEmbeddings(text: string): Promise<number[]> {
  // If we are in demo mode or OpenAI key is missing, return a dummy vector (1536 dimensions)
  if (!env.OPENAI_API_KEY) {
    return Array.from({ length: 1536 }, () => Math.random() - 0.5);
  }

  try {
    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error('No embedding returned from OpenAI API');
    }
    return embedding;
  } catch (error) {
    console.error('Failed to get OpenAI embeddings:', error);
    throw error;
  }
}
