'use client';

import { useState, useCallback } from 'react';

export interface ReviewItem {
  type: 'bug' | 'suggestion' | 'style';
  severity: 'critical' | 'major' | 'minor';
  line: number | null;
  message: string;
  fix: string | null;
}

export function useReview() {
  const [isLoading, setIsLoading] = useState(false);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startReview = useCallback(async (code: string, language: string) => {
    setIsLoading(true);
    setReviews([]);
    setRawText('');
    setError(null);

    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, language }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to request review');
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
        // Process Server-Sent Events (SSE) format
        const lines = chunkText.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(dataStr);
              
              // Handle Anthropic message format delta
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                accumulatedText += parsed.delta.text;
                setRawText(accumulatedText);
                
                // Attempt incremental JSON parsing of the array
                try {
                  // Find first array bracket
                  const startBracket = accumulatedText.indexOf('[');
                  if (startBracket !== -1) {
                    let jsonToParse = accumulatedText.substring(startBracket);
                    // If JSON doesn't close properly, try closing it for parsing
                    if (!jsonToParse.endsWith(']')) {
                      // Attempt to close open braces/brackets
                      let openBraces = 0;
                      let openBrackets = 0;
                      for (const char of jsonToParse) {
                        if (char === '{') openBraces++;
                        if (char === '}') openBraces--;
                        if (char === '[') openBrackets++;
                        if (char === ']') openBrackets--;
                      }
                      
                      // Auto-close open object if inside it
                      if (openBraces > 0) jsonToParse += '}';
                      if (openBrackets > 0) jsonToParse += ']';
                    }
                    
                    const parsedItems = JSON.parse(jsonToParse);
                    if (Array.isArray(parsedItems)) {
                      setReviews(parsedItems as ReviewItem[]);
                    }
                  }
                } catch {
                  // Ignore parse errors on incomplete stream chunks
                }
              } else if (parsed.type === 'message_stop') {
                // End of Anthropic message stream
                break;
              }
            } catch (err) {
              // Direct parsing fallback if not structured exactly in Anthropic SSE event format
              try {
                const parsed = JSON.parse(dataStr);
                if (Array.isArray(parsed)) {
                  setReviews(parsed as ReviewItem[]);
                }
              } catch {
                // Ignore chunk parse errors
              }
            }
          }
        }
      }

      // Final attempt to parse complete response
      try {
        const startBracket = accumulatedText.indexOf('[');
        if (startBracket !== -1) {
          const finalJSON = accumulatedText.substring(startBracket);
          const parsed = JSON.parse(finalJSON);
          if (Array.isArray(parsed)) {
            setReviews(parsed as ReviewItem[]);
          }
        }
      } catch (err) {
        console.warn('Failed to parse final code review structure:', err);
      }

    } catch (err: unknown) {
      console.error('Review streaming failed:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during code review');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    reviews,
    rawText,
    error,
    startReview,
  };
}
