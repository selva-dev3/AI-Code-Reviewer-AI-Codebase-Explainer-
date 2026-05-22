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
