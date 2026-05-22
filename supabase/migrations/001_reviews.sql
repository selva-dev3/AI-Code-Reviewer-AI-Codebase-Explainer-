-- reviews table
create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  created_at  timestamptz default now(),
  language    text,
  status      text default 'pending',  -- pending | complete | error
  storage_path text,                   -- path in Supabase Storage
  result      jsonb                    -- array of review items
);

alter table reviews enable row level security;

-- Separate policies for Select, Insert, Update as per standard
create policy "Users can select own reviews"
  on reviews for select
  using (auth.uid() = user_id);

create policy "Users can insert own reviews"
  on reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reviews"
  on reviews for update
  using (auth.uid() = user_id);
