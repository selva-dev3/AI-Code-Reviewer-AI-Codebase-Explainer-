'use client';

import { useState, useCallback } from 'react';

export function useStream() {
  const [isLoading, setIsLoading] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const askQuestion = useCallback(async (
    question: string, 
    projectId: string, 
    onChunk?: (text: string) => void
  ) => {
    setIsLoading(true);
    setStreamedText('');
    setError(null);

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, projectId }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to get answer');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response stream reader not available');
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value);
        const lines = chunkText.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                accumulatedText += parsed.delta.text;
                setStreamedText(accumulatedText);
                if (onChunk) {
                  onChunk(accumulatedText);
                }
              } else if (parsed.type === 'message_stop') {
                break;
              }
            } catch {
              // Direct string delta fallback
              try {
                const parsed = JSON.parse(dataStr);
                if (typeof parsed === 'string') {
                  accumulatedText += parsed;
                  setStreamedText(accumulatedText);
                  if (onChunk) {
                    onChunk(accumulatedText);
                  }
                }
              } catch {
                // Ignore parsing errors
              }
            }
          }
        }
      }

    } catch (err: unknown) {
      console.error('Explainer query failed:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during query');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    streamedText,
    error,
    askQuestion,
  };
}
