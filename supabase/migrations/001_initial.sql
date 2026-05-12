-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ═══════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default 'ผู้ใช้',
  avatar_url text,
  settings jsonb not null default '{
    "theme": "light",
    "accent": "black",
    "fs": "md",
    "defaultCategory": "",
    "defaultPriority": "medium",
    "warnDays": 3,
    "weekStart": "sun",
    "showTimer": true,
    "googleCalendarSync": false
  }',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'ผู้ใช้'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ═══════════════════════════════════════════════
-- CATEGORIES
-- ═══════════════════════════════════════════════
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles on delete cascade,
  name text not null,
  color text not null default '#6B6760',
  bg_color text not null default '#F0EEE9',
  is_preset boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
create policy "Users can manage own categories" on public.categories
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ═══════════════════════════════════════════════
-- TASKS
-- ═══════════════════════════════════════════════
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles on delete cascade,
  category_id uuid references public.categories on delete set null,
  title text not null,
  note text not null default '',
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  status text not null default 'todo' check (status in ('todo','in_progress','done')),
  deadline date,
  recurring text not null default '' check (recurring in ('','daily','weekly','monthly')),
  total_time_seconds int not null default 0,
  timer_started_at timestamptz,
  google_event_id text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_user_id_idx on public.tasks (user_id);
create index tasks_status_idx on public.tasks (user_id, status);
create index tasks_deadline_idx on public.tasks (user_id, deadline);

alter table public.tasks enable row level security;
create policy "Users can manage own tasks" on public.tasks
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at before update on public.tasks
  for each row execute procedure public.set_updated_at();

-- ═══════════════════════════════════════════════
-- SUBTASKS
-- ═══════════════════════════════════════════════
create table public.subtasks (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references public.tasks on delete cascade,
  title text not null,
  done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index subtasks_task_id_idx on public.subtasks (task_id);

alter table public.subtasks enable row level security;
create policy "Users can manage subtasks of own tasks" on public.subtasks
  using (exists (select 1 from public.tasks where id = task_id and user_id = auth.uid()))
  with check (exists (select 1 from public.tasks where id = task_id and user_id = auth.uid()));

-- ═══════════════════════════════════════════════
-- ACTIVITY LOG
-- ═══════════════════════════════════════════════
create table public.activity_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles on delete cascade,
  task_id uuid references public.tasks on delete set null,
  action text not null check (action in ('created','completed','updated','deleted')),
  task_title text not null,
  created_at timestamptz not null default now()
);

create index activity_log_user_idx on public.activity_log (user_id, created_at desc);

alter table public.activity_log enable row level security;
create policy "Users can view own activity" on public.activity_log
  using (auth.uid() = user_id);
create policy "Users can insert own activity" on public.activity_log
  for insert with check (auth.uid() = user_id);

-- ═══════════════════════════════════════════════
-- PUSH SUBSCRIPTIONS
-- ═══════════════════════════════════════════════
create table public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
create policy "Users can manage own push subscriptions" on public.push_subscriptions
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ═══════════════════════════════════════════════
-- REALTIME
-- ═══════════════════════════════════════════════
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.subtasks;
alter publication supabase_realtime add table public.categories;
