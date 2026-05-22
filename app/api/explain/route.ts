import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAnthropicClient, CLAUDE_MODEL } from '@/lib/claude';
import { getEmbeddings } from '@/lib/embeddings';
import { getExplainerSystemPrompt } from '@/lib/prompts/explainer';
import { isDemoMode } from '@/lib/env';

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
    }

    const { question, projectId } = await req.json();
    if (!question || !projectId) {
      return new Response('Question and ProjectId are required', { status: 400 });
    }

    // If demo mode, return mock stream
    if (isDemoMode) {
      return getDemoExplainStream(question, projectId);
    }

    // 1. Embed the question
    const embedding = await getEmbeddings(question);

    // 2. Retrieve relevant chunks from pgvector RPC
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data: chunks, error: rpcError } = await supabase.rpc('match_code_chunks', {
      query_embedding: embedding,
      target_project: projectId,
      match_count: 8,
    });

    if (rpcError) {
      console.error('Vector search RPC error:', rpcError);
      return new Response('Vector search failed', { status: 500 });
    }

    // 3. Build augmented prompt
    const contextContent = (chunks || [])
      .map((c: { file_path: string; start_line: number; end_line: number; content: string }) =>
        `// ${c.file_path} (lines ${c.start_line}–${c.end_line})\n${c.content}`
      )
      .join('\n\n---\n\n');

    const systemPrompt = getExplainerSystemPrompt(contextContent);

    // 4. Call Claude — stream back to client
    const anthropic = getAnthropicClient();
    const stream = anthropic.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
    });

    // 5. Save to chat history on end asynchronously
    stream.on('finalMessage', async (msg: any) => {
      try {
        const textContent = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
        await supabase
          .from('chat_messages')
          .insert([
            { project_id: projectId, role: 'user', content: question },
            { project_id: projectId, role: 'assistant', content: textContent },
          ]);
      } catch (err) {
        console.error('Failed to save chat message history:', err);
      }
    });

    return new Response(stream.toReadableStream(), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: unknown) {
    console.error('Explain endpoint error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Function to generate a simulated RAG stream in demo mode
function getDemoExplainStream(question: string, projectId: string) {
  const encoder = new TextEncoder();
  const qLower = question.toLowerCase();

  let answer = '';
  
  if (qLower.includes('router') || qLower.includes('route')) {
    answer = `Based on the codebase structure in [app/api/review/route.ts:L1] and [app/api/explain/route.ts:L1], routing is handled using Next.js 14/15 App Router.

Here is how the review route streaming works:
1. It validates the authorization via Supabase Auth.
2. It calls the Claude API singleton with \`model: 'claude-sonnet-4-6'\` and streams the JSON results using \`stream.toReadableStream()\`.
3. It listens to the \`finalMessage\` event to save the results in the database:
\`\`\`typescript
stream.on('finalMessage', async (msg) => {
  const result = JSON.parse(msg.content[0].text);
  await supabase.from('reviews').update({ status: 'complete', result }).eq('id', review.id);
});
\`\`\`

You can view the setup directly in [app/api/review/route.ts:L140] to see how the stream updates the reviews table.`;
  } else if (qLower.includes('database') || qLower.includes('schema') || qLower.includes('supabase') || qLower.includes('sql')) {
    answer = `The database schema is defined in version-controlled migrations inside the [supabase/migrations/:L1] directory:

- [supabase/migrations/001_reviews.sql:L1] creates the \`reviews\` table and sets up select, insert, and update policies separately. Row Level Security (RLS) is enabled.
- [supabase/migrations/002_projects.sql:L1] defines the \`projects\` table scope.
- [supabase/migrations/003_chunks.sql:L1] enables the \`pgvector\` extension and creates the \`code_chunks\` table with a 1536-dimensional vector column for storing embeddings:
\`\`\`sql
create table code_chunks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects not null,
  file_path   text,
  start_line  int,
  end_line    int,
  content     text,
  embedding   vector(1536)
);
\`\`\`
- [supabase/migrations/004_chat.sql:L1] creates the \`chat_messages\` table and implements the RAG cosine similarity RPC function \`match_code_chunks\` used for search in [supabase/functions/match_chunks.sql:L1].`;
  } else {
    answer = `I found some relevant components in the codebase matching your question:
1. The **Claude Singleton client** wrapper is instantiated in [lib/claude.ts:L8].
2. The **Zod environment validation** is parsed at startup in [lib/env.ts:L17] to ensure credentials are safe.
3. The **File Chunker** in [lib/chunker.ts:L11] splits files into logical functions and blocks of around 40 lines (approx. 400 tokens) before creating OpenAI vectors in [lib/embeddings.ts:L18].

Is there a specific part of the code structure, or a particular file like [app/globals.css:L1] that you would like me to explain in more detail?`;
  }

  const stream = new ReadableStream({
    async start(controller) {
      let index = 0;
      const chunkSize = 6;
      
      const interval = setInterval(() => {
        if (index >= answer.length) {
          controller.enqueue(encoder.encode(`event: message\ndata: {"type":"message_stop"}\n\n`));
          clearInterval(interval);
          controller.close();
          return;
        }
        
        const chunk = answer.slice(index, index + chunkSize);
        index += chunkSize;
        
        const payload = {
          type: 'content_block_delta',
          delta: {
            type: 'text_delta',
            text: chunk
          }
        };
        
        controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(payload)}\n\n`));
      }, 20);
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
