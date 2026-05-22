import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAnthropicClient, CLAUDE_MODEL } from '@/lib/claude';
import { REVIEW_SYSTEM_PROMPT } from '@/lib/prompts/reviewer';
import { isDemoMode } from '@/lib/env';
import { z } from 'zod';

// Review Item Schema for Zod validation
const reviewItemSchema = z.object({
  type: z.enum(['bug', 'suggestion', 'style']),
  severity: z.enum(['critical', 'major', 'minor']),
  line: z.number().nullable(),
  message: z.string(),
  fix: z.string().nullable(),
});

const reviewArraySchema = z.array(reviewItemSchema);

// Simple in-memory rate limiter for server
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const userRequests = rateLimitMap.get(userId) || 0;
  
  if (userRequests >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  rateLimitMap.set(userId, userRequests + 1);
  setTimeout(() => {
    const current = rateLimitMap.get(userId) || 0;
    if (current > 0) rateLimitMap.set(userId, current - 1);
  }, RATE_LIMIT_WINDOW_MS);
  
  return false;
}

export async function POST(req: Request) {
  try {
    let userId = 'demo-user';
    let supabase = null;

    if (!isDemoMode) {
      supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return new Response('Unauthorized', { status: 401 });
      }
      userId = user.id;

      // Rate limit check
      if (isRateLimited(userId)) {
        return new Response('Too Many Requests. Rate limit exceeded.', { status: 429 });
      }
    }

    const { code, language } = await req.json();
    if (!code || !language) {
      return new Response('Code and Language are required', { status: 400 });
    }

    // 1. Save raw code to Storage & insert pending review if in real mode
    let reviewId = 'demo-review-' + Date.now();
    let storagePath = 'demo-path';

    if (supabase && !isDemoMode) {
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.txt`;
      const { data: fileData, error: uploadError } = await supabase.storage
        .from('code-files')
        .upload(fileName, code);

      if (uploadError) {
        console.error('Storage upload failed:', uploadError);
      } else {
        storagePath = fileData?.path || fileName;
      }

      const { data: reviewRow, error: insertError } = await supabase
        .from('reviews')
        .insert({
          user_id: userId,
          language,
          storage_path: storagePath,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert review failed:', insertError);
        return new Response('Database operation failed', { status: 500 });
      }
      reviewId = reviewRow.id;
    }

    // If demo mode, return mock stream
    if (isDemoMode) {
      return getDemoStream(code, language, reviewId);
    }

    // 2. Call Claude — stream back to client
    const anthropic = getAnthropicClient();
    
    // Using .stream() for Anthropic
    const stream = anthropic.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: REVIEW_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Language: ${language}\nCode:\n${code}` }],
    });

    // 3. On stream end — save result to Supabase asynchronously without blocking client stream
    stream.on('finalMessage', async (msg: any) => {
      try {
        const textContent = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
        let parsedResult: unknown = [];
        try {
          parsedResult = JSON.parse(textContent);
          // Validate with Zod
          const validated = reviewArraySchema.safeParse(parsedResult);
          if (validated.success) {
            parsedResult = validated.data;
          } else {
            console.warn('Claude output validation failed:', validated.error);
          }
        } catch (e) {
          console.error('Failed to parse final Claude response as JSON:', e);
        }

        if (supabase) {
          await supabase
            .from('reviews')
            .update({
              status: 'complete',
              result: parsedResult,
            })
            .eq('id', reviewId);
        }
      } catch (err) {
        console.error('Error updating review row on stream end:', err);
      }
    });

    // Pipe the stream back as SSE
    return new Response(stream.toReadableStream(), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: unknown) {
    console.error('Review endpoint error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Function to generate a simulated SSE stream in demo mode
function getDemoStream(code: string, language: string, reviewId: string) {
  const encoder = new TextEncoder();
  
  // Create simulated reviews based on simple analysis of the input code
  const mockReviews = [
    {
      type: 'bug',
      severity: 'critical',
      line: code.includes('any') ? code.split('\n').findIndex(l => l.includes('any')) + 1 : 2,
      message: 'Explicit use of "any" type detected. This bypasses TypeScript\'s type checking safety and can lead to runtime errors.',
      fix: '// Use a strict type, generic, or unknown with a type guard\nfunction processData(data: unknown) {\n  if (typeof data === "string") {\n    return data.trim();\n  }\n}'
    },
    {
      type: 'suggestion',
      severity: 'major',
      line: code.includes('fetch') ? code.split('\n').findIndex(l => l.includes('fetch')) + 1 : 5,
      message: 'API request is not wrapped in a try/catch block. Expected failures (e.g. network timeout) should be gracefully handled.',
      fix: 'try {\n  const response = await fetch(url);\n  return { data: await response.json(), error: null };\n} catch (error) {\n  console.error("Fetch failed:", error);\n  return { data: null, error };\n}'
    },
    {
      type: 'style',
      severity: 'minor',
      line: 8,
      message: 'Function name is generic. Use a more descriptive verb-noun naming scheme to represent its functional scope.',
      fix: 'function executeCodeReviewRequest() {\n  // ...\n}'
    }
  ];

  const stream = new ReadableStream({
    async start(controller) {
      // Send events resembling Anthropic SSE chunk formats
      const mockJSON = JSON.stringify(mockReviews, null, 2);
      
      // Let's stream character by character to mimic real token streams
      let index = 0;
      const chunkSize = 8; // characters per chunk
      
      const interval = setInterval(() => {
        if (index >= mockJSON.length) {
          // Send final message payload event
          controller.enqueue(encoder.encode(`event: message\ndata: {"type":"message_stop"}\n\n`));
          clearInterval(interval);
          controller.close();
          return;
        }
        
        const chunk = mockJSON.slice(index, index + chunkSize);
        index += chunkSize;
        
        // Format of Anthropic message stream content block delta
        const payload = {
          type: 'content_block_delta',
          delta: {
            type: 'text_delta',
            text: chunk
          }
        };
        
        controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(payload)}\n\n`));
      }, 30);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
