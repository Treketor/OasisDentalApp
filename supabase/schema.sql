-- Oasis Tasks initial Supabase schema.
-- Privacy note: tasks include an optional patient_reference field only.
-- Do not store full patient names or detailed clinical/medical information.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'receptionist',
  location text,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (
    role in ('receptionist', 'nurse', 'dentist', 'manager', 'admin')
  )
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  patient_reference text,
  status text not null default 'new',
  priority text not null default 'normal',
  category text not null default 'other',
  created_by uuid not null references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  location text,
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_status_check check (
    status in ('new', 'in_progress', 'waiting', 'completed', 'cancelled')
  ),
  constraint tasks_priority_check check (
    priority in ('low', 'normal', 'urgent')
  ),
  constraint tasks_category_check check (
    category in (
      'patient_follow_up',
      'lab',
      'admin',
      'clinical',
      'sterilisation',
      'referral',
      'other'
    )
  )
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid references public.profiles(id),
  event_type text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tasks_assigned_to_idx on public.tasks(assigned_to);
create index if not exists tasks_created_by_idx on public.tasks(created_by);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_priority_idx on public.tasks(priority);
create index if not exists tasks_due_date_idx on public.tasks(due_date);
create index if not exists tasks_location_idx on public.tasks(location);
create index if not exists task_comments_task_id_idx on public.task_comments(task_id);
create index if not exists task_events_task_id_idx on public.task_events(task_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_approved from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.current_user_is_manager_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('manager', 'admin');
$$;

create or replace function public.can_access_task(task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select public.current_user_is_approved()
        and (
          t.created_by = auth.uid()
          or t.assigned_to = auth.uid()
          or public.current_user_is_manager_or_admin()
        )
      from public.tasks t
      where t.id = task_id
    ),
    false
  );
$$;

create or replace function public.debug_task_create_access()
returns table (
  auth_uid uuid,
  profile_id uuid,
  profile_email text,
  profile_role text,
  profile_is_approved boolean,
  can_create_task boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() as auth_uid,
    p.id as profile_id,
    p.email as profile_email,
    p.role as profile_role,
    p.is_approved as profile_is_approved,
    coalesce(p.id = auth.uid() and p.is_approved = true, false) as can_create_task
  from public.profiles p
  where p.id = auth.uid()
  union all
  select auth.uid(), null, null, null, null, false
  where not exists (
    select 1 from public.profiles p where p.id = auth.uid()
  )
  limit 1;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := new.raw_user_meta_data ->> 'requested_role';

  insert into public.profiles (
    id,
    full_name,
    email,
    role,
    location,
    is_approved
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'New staff member'),
    coalesce(new.email, ''),
    case
      when requested_role in ('receptionist', 'nurse', 'dentist') then requested_role
      else 'receptionist'
    end,
    nullif(new.raw_user_meta_data ->> 'location', ''),
    false
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS alone cannot reliably restrict updates to specific columns based on role.
-- This trigger keeps self-service profile edits to full_name/location only while
-- allowing managers/admins to manage role, location, and approval status.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Manual SQL Editor, migrations, and service-role operations do not have an
  -- auth.uid(). Allow those trusted database-side operations so the first admin
  -- can be approved and future migrations do not trip the app-facing guard.
  if auth.uid() is null then
    return new;
  end if;

  if public.current_user_is_manager_or_admin() then
    return new;
  end if;

  if old.id = auth.uid()
    and new.id = old.id
    and new.email = old.email
    and new.role = old.role
    and new.is_approved = old.is_approved
    and new.created_at = old.created_at
  then
    return new;
  end if;

  raise exception 'Only managers/admins can update profile approval or role fields';
end;
$$;

drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update
before update on public.profiles
for each row execute function public.guard_profile_update();

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_events enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "Approved users can read approved profiles" on public.profiles;
create policy "Approved users can read approved profiles"
on public.profiles for select
to authenticated
using (public.current_user_is_approved() and is_approved = true);

drop policy if exists "Managers and admins can read all profiles" on public.profiles;
create policy "Managers and admins can read all profiles"
on public.profiles for select
to authenticated
using (public.current_user_is_manager_or_admin());

drop policy if exists "Users can update their own profile basics" on public.profiles;
create policy "Users can update their own profile basics"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Managers and admins can update profiles" on public.profiles;
create policy "Managers and admins can update profiles"
on public.profiles for update
to authenticated
using (public.current_user_is_manager_or_admin())
with check (public.current_user_is_manager_or_admin());

drop policy if exists "Approved users can read accessible tasks" on public.tasks;
create policy "Approved users can read accessible tasks"
on public.tasks for select
to authenticated
using (public.can_access_task(id));

drop policy if exists "Approved users can create tasks" on public.tasks;
create policy "Approved users can create tasks"
on public.tasks for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_approved = true
  )
);

drop policy if exists "Approved task participants can update tasks" on public.tasks;
create policy "Approved task participants can update tasks"
on public.tasks for update
to authenticated
using (public.can_access_task(id))
with check (public.current_user_is_approved());

drop policy if exists "Managers and admins can delete tasks" on public.tasks;
create policy "Managers and admins can delete tasks"
on public.tasks for delete
to authenticated
using (public.current_user_is_approved() and public.current_user_is_manager_or_admin());

drop policy if exists "Approved users can read accessible task comments" on public.task_comments;
create policy "Approved users can read accessible task comments"
on public.task_comments for select
to authenticated
using (public.can_access_task(task_id));

drop policy if exists "Approved users can create comments on accessible tasks" on public.task_comments;
create policy "Approved users can create comments on accessible tasks"
on public.task_comments for insert
to authenticated
with check (
  public.current_user_is_approved()
  and user_id = auth.uid()
  and public.can_access_task(task_id)
);

drop policy if exists "Approved users can read accessible task events" on public.task_events;
create policy "Approved users can read accessible task events"
on public.task_events for select
to authenticated
using (public.can_access_task(task_id));

drop policy if exists "Approved users can create task events" on public.task_events;
create policy "Approved users can create task events"
on public.task_events for insert
to authenticated
with check (
  public.current_user_is_approved()
  and (user_id is null or user_id = auth.uid())
  and public.can_access_task(task_id)
);
