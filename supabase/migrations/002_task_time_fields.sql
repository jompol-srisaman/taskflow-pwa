-- Add start_time and end_time to tasks
alter table public.tasks
  add column if not exists start_time time,
  add column if not exists end_time time;
