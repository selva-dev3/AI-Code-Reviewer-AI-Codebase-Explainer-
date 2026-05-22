-- Projects table
create table if not exists projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  name       text,
  created_at timestamptz default now()
);

alter table projects enable row level security;

-- Separate RLS policies
create policy "Users can select own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on projects for delete
  using (auth.uid() = user_id);
