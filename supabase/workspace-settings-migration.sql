-- Oasis Tasks workspace settings migration.
-- Run after supabase/workplace-categories-migration.sql.
-- Adds optional workspace customisation without changing existing task rows.

create table if not exists public.task_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  color text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  color text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists staff_category text;

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
    staff_category,
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
    null,
    nullif(new.raw_user_meta_data ->> 'requested_staff_category', ''),
    false
  );

  return new;
end;
$$;

alter table public.tasks
drop constraint if exists tasks_category_check;

alter table public.tasks
add constraint tasks_category_check check (length(trim(category)) > 0);

alter table public.task_templates
drop constraint if exists task_templates_default_category_check;

alter table public.task_templates
add constraint task_templates_default_category_check check (length(trim(default_category)) > 0);

create index if not exists task_categories_active_idx on public.task_categories(is_active);
create index if not exists task_categories_sort_order_idx on public.task_categories(sort_order);
create index if not exists staff_categories_active_idx on public.staff_categories(is_active);
create index if not exists staff_categories_sort_order_idx on public.staff_categories(sort_order);
create index if not exists profiles_staff_category_idx on public.profiles(staff_category);

drop trigger if exists task_categories_set_updated_at on public.task_categories;
create trigger task_categories_set_updated_at
before update on public.task_categories
for each row execute function public.set_updated_at();

drop trigger if exists staff_categories_set_updated_at on public.staff_categories;
create trigger staff_categories_set_updated_at
before update on public.staff_categories
for each row execute function public.set_updated_at();

drop trigger if exists workspace_permissions_set_updated_at on public.workspace_permissions;
create trigger workspace_permissions_set_updated_at
before update on public.workspace_permissions
for each row execute function public.set_updated_at();

insert into public.task_categories (name, slug, sort_order)
values
  ('Call back', 'call_back', 10),
  ('Admin', 'admin', 20),
  ('Cleaning', 'cleaning', 30),
  ('Ordering', 'ordering', 40),
  ('Room setup', 'room_setup', 50),
  ('Stock', 'stock', 60),
  ('Maintenance', 'maintenance', 70),
  ('Follow-up', 'follow_up', 80),
  ('Other', 'other', 90)
on conflict (slug) do nothing;

insert into public.staff_categories (name, slug, sort_order)
values
  ('Reception', 'reception', 10),
  ('Nurse', 'nurse', 20),
  ('Dentist', 'dentist', 30),
  ('Manager', 'manager', 40),
  ('Admin', 'admin', 50),
  ('Other', 'other', 60)
on conflict (slug) do nothing;

insert into public.workspace_permissions (key, label, description, enabled)
values
  ('staff_can_edit_assigned_task_details', 'Assigned staff can edit task details', 'Allows assigned non-manager staff to edit title, details, due date, category, priority, and assignee.', false),
  ('staff_can_edit_created_task_after_assignment', 'Creators can edit tasks after assigning', 'Allows staff to keep editing tasks they created, even after assigning them to someone else.', true),
  ('staff_can_delete_own_tasks', 'Staff can delete their own tasks', 'Allows non-manager staff to delete tasks they created.', false),
  ('staff_can_reassign_assigned_tasks', 'Assigned staff can reassign tasks', 'Allows assigned non-manager staff to change who a task is assigned to.', false),
  ('staff_can_cancel_assigned_tasks', 'Assigned staff can cancel tasks', 'Allows assigned non-manager staff to cancel tasks.', true),
  ('staff_can_edit_own_notes', 'Staff can edit their own notes', 'Allows staff to edit notes they created.', true),
  ('staff_can_delete_own_notes', 'Staff can delete their own notes', 'Allows staff to delete notes they created.', false),
  ('staff_can_resolve_any_note', 'Staff can resolve any note', 'Allows staff to resolve notes created by other staff.', true),
  ('staff_can_edit_own_display_name', 'Staff can edit their own display name', 'Allows staff to update the name shown in Oasis Tasks.', true),
  ('staff_can_choose_staff_category', 'Staff can choose their staff category', 'Allows staff to choose their display category in Account settings.', false)
on conflict (key) do update
set label = excluded.label,
    description = excluded.description;

alter table public.task_categories enable row level security;
alter table public.staff_categories enable row level security;
alter table public.workspace_permissions enable row level security;

drop policy if exists "Approved users can read active task categories" on public.task_categories;
create policy "Approved users can read active task categories"
on public.task_categories for select
to authenticated
using (public.current_user_is_approved() and is_active);

drop policy if exists "Managers and admins can read all task categories" on public.task_categories;
create policy "Managers and admins can read all task categories"
on public.task_categories for select
to authenticated
using (public.current_user_is_approved() and public.current_user_is_manager_or_admin());

drop policy if exists "Managers and admins can manage task categories" on public.task_categories;
create policy "Managers and admins can manage task categories"
on public.task_categories for all
to authenticated
using (public.current_user_is_approved() and public.current_user_is_manager_or_admin())
with check (public.current_user_is_approved() and public.current_user_is_manager_or_admin());

drop policy if exists "Approved users can read active staff categories" on public.staff_categories;
create policy "Approved users can read active staff categories"
on public.staff_categories for select
to authenticated
using (public.current_user_is_approved() and is_active);

drop policy if exists "Managers and admins can read all staff categories" on public.staff_categories;
create policy "Managers and admins can read all staff categories"
on public.staff_categories for select
to authenticated
using (public.current_user_is_approved() and public.current_user_is_manager_or_admin());

drop policy if exists "Managers and admins can manage staff categories" on public.staff_categories;
create policy "Managers and admins can manage staff categories"
on public.staff_categories for all
to authenticated
using (public.current_user_is_approved() and public.current_user_is_manager_or_admin())
with check (public.current_user_is_approved() and public.current_user_is_manager_or_admin());

drop policy if exists "Approved users can read workspace permissions" on public.workspace_permissions;
create policy "Approved users can read workspace permissions"
on public.workspace_permissions for select
to authenticated
using (public.current_user_is_approved());

drop policy if exists "Managers and admins can update workspace permissions" on public.workspace_permissions;
create policy "Managers and admins can update workspace permissions"
on public.workspace_permissions for update
to authenticated
using (public.current_user_is_approved() and public.current_user_is_manager_or_admin())
with check (public.current_user_is_approved() and public.current_user_is_manager_or_admin());
