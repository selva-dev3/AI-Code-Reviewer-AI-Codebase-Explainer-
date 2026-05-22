-- Chat history
create table if not exists chat_messages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects not null,
  role        text,           -- 'user' | 'assistant'
  content     text,
  created_at  timestamptz default now()
);

alter table chat_messages enable row level security;

-- Separate RLS policies
create policy "Users can select own chat messages"
  on chat_messages for select
  using (project_id in (select id from projects where user_id = auth.uid()));

create policy "Users can insert own chat messages"
  on chat_messages for insert
  with check (project_id in (select id from projects where user_id = auth.uid()));

-- Vector search matching function
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
