import Anthropic from '@anthropic-ai/sdk';
import { env } from './env';

export const CLAUDE_MODEL = 'claude-sonnet-4-6';

let anthropicInstance: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!anthropicInstance) {
    // If API key is missing, we initialize with a dummy string so it doesn't crash on startup.
    // At runtime, we check isDemoMode to bypass actual Claude requests.
    const apiKey = env.ANTHROPIC_API_KEY || 'dummy-api-key';
    anthropicInstance = new Anthropic({
      apiKey: apiKey,
    });
  }
  return anthropicInstance;
}
