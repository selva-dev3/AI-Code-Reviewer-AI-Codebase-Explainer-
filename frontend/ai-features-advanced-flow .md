# AI Code Reviewer & AI Codebase Explainer — Advanced Flow

**Stack:** Next.js (frontend) · Supabase (backend) · Claude API (claude-sonnet-4-6)

---

## Feature 1 — AI Code Reviewer

### Purpose
Allow users to paste or upload code files and receive a streamed, structured review: bugs, improvement suggestions, and severity ratings — inline with the code.

---

### Flow

```
User pastes/uploads code
        │
        ▼ POST /api/review
┌─────────────────────────┐
│   Next.js API Route     │  ──► Supabase Storage (save raw file)
│   Auth check + parse    │  ──► Supabase DB (insert review row: status=pending)
└────────────┬────────────┘
             │ stream request
             ▼
┌─────────────────────────────────────────────────────┐
│   Claude API  (claude-sonnet-4-6)                   │
│   System prompt: senior code reviewer               │
│   User message: <language> + <code>                 │
│   Output: streamed JSON — bugs · suggestions · sev  │
└────────────────────────┬────────────────────────────┘
                         │ SSE stream
                         ▼
              ┌─────────────────────┐
              │   Stream Parser      │
              │   Chunk → JSON block │
              └──────────┬──────────┘
                         │
             ┌───────────┴──────────┐
             ▼                      ▼
   Review Panel (UI)         Supabase DB
   Inline diff · badges      Update review row
   Severity colours          status=complete
```

---

### Key Design Decisions

**Streaming first.** The Claude API response is streamed via SSE so users see results token-by-token — no waiting for the full response. The Next.js API Route uses `ReadableStream` to pipe the Claude response directly to the client.

**Structured output.** The system prompt instructs Claude to emit structured JSON blocks inside the stream. The stream parser on the client accumulates chunks until a complete block is detected, then renders it.

**Supabase for persistence.** Every review is stored so users can revisit past reviews. The DB row is inserted before the Claude call (status=pending) and updated on completion (status=complete). Supabase Storage holds the raw file for re-review.

**Auth via Supabase Auth.** The API route validates the Supabase JWT on every request before calling Claude. Users can only view their own reviews (Row Level Security).

---

### Claude Prompt Template

```
System:
You are a senior software engineer conducting a thorough code review.
Analyse the provided code and respond with a JSON array of review items.
Each item must have:
  - "type": "bug" | "suggestion" | "style"
  - "severity": "critical" | "major" | "minor"
  - "line": <line number or null>
  - "message": <concise explanation>
  - "fix": <code snippet or null>

Respond ONLY with the JSON array. No preamble. No markdown fences.

User:
Language: TypeScript
Code:
<code here>
```

---

### Supabase Schema

```sql
-- reviews table
create table reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  created_at  timestamptz default now(),
  language    text,
  status      text default 'pending',  -- pending | complete | error
  storage_path text,                   -- path in Supabase Storage
  result      jsonb                    -- array of review items
);

alter table reviews enable row level security;

create policy "Users can read own reviews"
  on reviews for select
  using (auth.uid() = user_id);
```

---

### Next.js API Route Skeleton

```ts
// app/api/review/route.ts
import { createServerClient } from '@supabase/ssr'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  const supabase = createServerClient(...)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { code, language } = await req.json()

  // 1. Save raw code to Storage
  const { data: file } = await supabase.storage
    .from('code-files')
    .upload(`${user.id}/${Date.now()}.txt`, code)

  // 2. Insert pending review row
  const { data: review } = await supabase
    .from('reviews')
    .insert({ user_id: user.id, language, storage_path: file?.path, status: 'pending' })
    .select().single()

  // 3. Call Claude — stream back to client
  const anthropic = new Anthropic()
  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: REVIEW_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Language: ${language}\nCode:\n${code}` }]
  })

  // 4. On stream end — save result
  stream.on('finalMessage', async (msg) => {
    const result = JSON.parse(msg.content[0].text)
    await supabase.from('reviews').update({ status: 'complete', result }).eq('id', review.id)
  })

  return new Response(stream.toReadableStream(), {
    headers: { 'Content-Type': 'text/event-stream' }
  })
}
```

---

## Feature 2 — AI Codebase Explainer

### Purpose
Let users upload an entire codebase (or paste multiple files), ask natural-language questions about it, and receive streamed, accurate answers grounded in the actual code — with source file references.

This feature uses **Retrieval-Augmented Generation (RAG)**: the codebase is chunked, embedded, and stored as vectors in Supabase's `pgvector` extension. Each question embeds the query, retrieves the most relevant chunks, and passes them to Claude as context.

---

### Flow

```
User uploads repo / pastes files
        │
        ▼ POST /api/explain
┌─────────────────────────┐
│   Next.js API Route     │  ──► Supabase Storage (save all files)
│   Auth + file tree      │
└────────────┬────────────┘
             │ chunk + embed
             ▼
┌───────────────────────────────────────────────────┐
│   Embedding Pipeline                               │
│   1. Split each file into ~400-token chunks        │
│   2. Call OpenAI text-embedding-3-small            │
│   3. Store vectors in Supabase pgvector            │
└───────────────────────────────────────────────────┘

        User asks a question
        │
        ▼
┌─────────────────────────┐
│   Chat Input (Next.js)   │
│   Natural language Q     │
└────────────┬────────────┘
             │ embed query → vector search
             ▼
┌───────────────────────────────────────────────────┐
│   RAG Retrieval                                    │
│   pgvector cosine similarity search                │
│   Returns top-k most relevant code chunks          │
└────────────────────────┬──────────────────────────┘
                         │ augmented prompt
                         ▼
┌───────────────────────────────────────────────────┐
│   Claude API  (claude-sonnet-4-6)                  │
│   System: codebase guide with retrieved chunks     │
│   User: original question                          │
│   Output: streamed explanation + file references   │
└────────────────────────┬──────────────────────────┘
                         │ stream
                         ▼
             ┌──────────────────────┐      ┌─────────────────┐
             │  Chat UI (Next.js)   │ ───► │  Supabase DB    │
             │  Streamed answer     │      │  Save chat hist  │
             │  + source file links │      └─────────────────┘
             └──────────────────────┘
```

---

### Key Design Decisions

**pgvector in Supabase.** Supabase ships the `pgvector` extension natively. No separate vector database needed — vectors live next to your relational data and can be joined with user/session tables.

**Chunking strategy.** Files are split by logical boundaries first (functions, classes), then by token count (~400 tokens). Each chunk stores: `file_path`, `start_line`, `end_line`, `content`, `embedding`.

**Embeddings model.** OpenAI `text-embedding-3-small` is cost-effective for code. Alternatively, use `voyage-code-2` (Voyage AI) for better code-specific embeddings.

**Context window budget.** Top 8 chunks (~3,200 tokens) are injected into Claude's context, leaving ample room for the answer in a 8k context window.

**Auth scoping.** Each codebase upload is tied to a `project` owned by the user. Vector search is filtered by `project_id` so users never see each other's code.

---

### Supabase Schema

```sql
-- Enable pgvector
create extension if not exists vector;

-- Projects (a codebase upload)
create table projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  name       text,
  created_at timestamptz default now()
);

-- Code chunks with embeddings
create table code_chunks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects not null,
  file_path   text,
  start_line  int,
  end_line    int,
  content     text,
  embedding   vector(1536)   -- matches text-embedding-3-small dimensions
);

-- Fast ANN index
create index on code_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Chat history
create table chat_messages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects not null,
  role        text,           -- 'user' | 'assistant'
  content     text,
  created_at  timestamptz default now()
);

-- RLS
alter table projects      enable row level security;
alter table code_chunks   enable row level security;
alter table chat_messages enable row level security;

create policy "Users own their projects"
  on projects for all using (auth.uid() = user_id);

create policy "Users access own project chunks"
  on code_chunks for all
  using (project_id in (select id from projects where user_id = auth.uid()));
```

---

### Vector Search Function

```sql
create or replace function match_code_chunks(
  query_embedding vector(1536),
  target_project  uuid,
  match_count     int default 8
)
returns table (
  id         uuid,
  file_path  text,
  start_line int,
  end_line   int,
  content    text,
  similarity float
)
language sql stable as $$
  select
    id, file_path, start_line, end_line, content,
    1 - (embedding <=> query_embedding) as similarity
  from code_chunks
  where project_id = target_project
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

---

### Next.js API Route Skeleton

```ts
// app/api/explain/route.ts
export async function POST(req: Request) {
  const { question, projectId } = await req.json()

  // 1. Embed the user's question
  const { data: [{ embedding }] } = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question
  })

  // 2. Retrieve relevant chunks from pgvector
  const { data: chunks } = await supabase.rpc('match_code_chunks', {
    query_embedding: embedding,
    target_project: projectId,
    match_count: 8
  })

  // 3. Build augmented prompt
  const context = chunks.map(c =>
    `// ${c.file_path} (lines ${c.start_line}–${c.end_line})\n${c.content}`
  ).join('\n\n---\n\n')

  // 4. Call Claude — stream back
  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `You are an expert on this codebase. Use only the provided code context to answer questions.
Always cite the file path and line numbers you're referencing.

<context>
${context}
</context>`,
    messages: [{ role: 'user', content: question }]
  })

  // 5. Save to chat history on end
  stream.on('finalMessage', async (msg) => {
    await supabase.from('chat_messages').insert([
      { project_id: projectId, role: 'user', content: question },
      { project_id: projectId, role: 'assistant', content: msg.content[0].text }
    ])
  })

  return new Response(stream.toReadableStream(), {
    headers: { 'Content-Type': 'text/event-stream' }
  })
}
```

---

## Shared Infrastructure

| Concern | Solution |
|---|---|
| Auth | Supabase Auth (JWT, RLS) |
| File storage | Supabase Storage |
| Relational data | Supabase Postgres |
| Vector search | Supabase pgvector |
| LLM | Claude claude-sonnet-4-6 (Anthropic) |
| Embeddings | OpenAI text-embedding-3-small |
| Frontend | Next.js 14 App Router |
| Streaming | SSE via `ReadableStream` |
| Rate limiting | Supabase Edge Functions or Upstash |

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

---

## Security Checklist

- [ ] All API routes validate Supabase JWT before calling Claude or OpenAI
- [ ] Row Level Security enabled on all tables
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never exposed to the client
- [ ] `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` server-side only
- [ ] File uploads validated for size and type before Storage upload
- [ ] Rate limiting on `/api/review` and `/api/explain` per user
- [ ] Code chunks sanitized before embedding (strip secrets/tokens if needed)

---

## Project File Structure

```
my-app/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx                  # Login page
│   │   └── signup/
│   │       └── page.tsx                  # Signup page
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Dashboard shell + Supabase session
│   │   ├── page.tsx                      # Home / project list
│   │   ├── review/
│   │   │   ├── page.tsx                  # [AI feature] Code reviewer UI
│   │   │   └── [id]/page.tsx             # [AI feature] Past review detail
│   │   └── explain/
│   │       ├── page.tsx                  # [AI feature] Codebase explainer UI
│   │       └── [projectId]/page.tsx      # [AI feature] Chat for a project
│   │
│   ├── api/
│   │   ├── review/
│   │   │   └── route.ts                  # [AI feature] POST → Claude review stream
│   │   ├── explain/
│   │   │   └── route.ts                  # [AI feature] POST → RAG + Claude stream
│   │   └── embed/
│   │       └── route.ts                  # [AI feature] POST → chunk + embed files
│   │
│   ├── layout.tsx                        # Root layout
│   └── globals.css
│
├── components/
│   ├── review/
│   │   ├── CodeEditor.tsx                # Monaco editor wrapper
│   │   ├── ReviewPanel.tsx               # Streaming review results
│   │   ├── SeverityBadge.tsx             # critical / major / minor chip
│   │   └── DiffView.tsx                  # Inline diff with highlights
│   ├── explain/
│   │   ├── FileUploader.tsx              # Drag-drop repo upload
│   │   ├── ChatWindow.tsx                # Streamed Q&A chat UI
│   │   └── SourceChip.tsx                # Clickable file:line reference
│   └── ui/
│       ├── Button.tsx                    # Shared button
│       ├── Spinner.tsx                   # Loading state
│       └── StreamText.tsx                # SSE token renderer
│
├── lib/
│   ├── claude.ts                         # Anthropic SDK wrapper + stream helpers
│   ├── embeddings.ts                     # OpenAI embeddings client
│   ├── chunker.ts                        # File → token chunks splitter
│   ├── supabase/
│   │   ├── client.ts                     # Browser Supabase client
│   │   ├── server.ts                     # Server Supabase client (RSC / Route)
│   │   └── middleware.ts                 # Session refresh helper
│   ├── prompts/
│   │   ├── reviewer.ts                   # Code reviewer system prompt
│   │   └── explainer.ts                  # Codebase explainer system prompt
│   └── utils.ts
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_reviews.sql               # reviews table + RLS
│   │   ├── 002_projects.sql              # projects table + RLS
│   │   ├── 003_chunks.sql                # code_chunks + pgvector index
│   │   └── 004_chat.sql                  # chat_messages + RLS
│   ├── functions/
│   │   └── match_chunks.sql              # pgvector similarity search fn
│   ├── seed.sql                          # Dev seed data
│   └── config.toml                       # Supabase local config
│
├── types/
│   ├── review.ts                         # ReviewItem, ReviewStatus types
│   ├── project.ts                        # Project, CodeChunk types
│   └── supabase.ts                       # Generated DB types (supabase gen)
│
├── middleware.ts                          # Next.js middleware — auth redirect
├── .env.local                             # API keys (never commit)
├── next.config.ts
├── tsconfig.json
└── package.json
```

### Key file responsibilities

| File | Responsibility |
|---|---|
| `app/api/review/route.ts` | Auth check → save to Storage → stream Claude review |
| `app/api/embed/route.ts` | Receive files → chunk → embed → store in pgvector |
| `app/api/explain/route.ts` | Embed query → pgvector search → stream Claude answer |
| `lib/claude.ts` | Single place for Anthropic client config and streaming helpers |
| `lib/chunker.ts` | Splits files into ~400-token chunks respecting function boundaries |
| `lib/embeddings.ts` | OpenAI embedding calls with batching and retry |
| `lib/supabase/server.ts` | Server-side client used in API routes (service role or JWT) |
| `supabase/migrations/` | Version-controlled schema — run via `supabase db push` |
| `types/supabase.ts` | Auto-generated via `supabase gen types typescript` — never edit by hand |

