-- Oasis Tasks saved task views migration.
-- Run after supabase/schema.sql.

create table if not exists public.saved_task_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  sort_key text not null default 'due_date',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_task_views_user_id_idx on public.saved_task_views(user_id);
create index if not exists saved_task_views_is_default_idx on public.saved_task_views(is_default);

drop trigger if exists saved_task_views_set_updated_at on public.saved_task_views;
create trigger saved_task_views_set_updated_at
before update on public.saved_task_views
for each row execute function public.set_updated_at();

create or replace function public.clear_other_default_saved_task_views()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_default then
    update public.saved_task_views
    set is_default = false
    where user_id = new.user_id
      and id <> new.id
      and is_default = true;
  end if;

  return new;
end;
$$;

drop trigger if exists saved_task_views_single_default on public.saved_task_views;
create trigger saved_task_views_single_default
after insert or update of is_default on public.saved_task_views
for each row execute function public.clear_other_default_saved_task_views();

alter table public.saved_task_views enable row level security;

drop policy if exists "Users can read their own saved task views" on public.saved_task_views;
create policy "Users can read their own saved task views"
on public.saved_task_views for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create their own saved task views" on public.saved_task_views;
create policy "Users can create their own saved task views"
on public.saved_task_views for insert
to authenticated
with check (public.current_user_is_approved() and user_id = auth.uid());

drop policy if exists "Users can update their own saved task views" on public.saved_task_views;
create policy "Users can update their own saved task views"
on public.saved_task_views for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own saved task views" on public.saved_task_views;
create policy "Users can delete their own saved task views"
on public.saved_task_views for delete
to authenticated
using (user_id = auth.uid());
