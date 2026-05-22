-- Enable pgvector
create extension if not exists vector;

-- Code chunks table
create table if not exists code_chunks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects not null,
  file_path   text,
  start_line  int,
  end_line    int,
  content     text,
  embedding   vector(1536)   -- matches text-embedding-3-small dimensions
);

-- Fast ANN index
create index if not exists code_chunks_embedding_idx on code_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table code_chunks enable row level security;

-- Separate RLS policies
create policy "Users can select own project chunks"
  on code_chunks for select
  using (project_id in (select id from projects where user_id = auth.uid()));

create policy "Users can insert own project chunks"
  on code_chunks for insert
  with check (project_id in (select id from projects where user_id = auth.uid()));

create policy "Users can delete own project chunks"
  on code_chunks for delete
  using (project_id in (select id from projects where user_id = auth.uid()));
