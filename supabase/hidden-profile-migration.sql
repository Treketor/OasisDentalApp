-- Oasis Tasks hidden profile migration.
-- Run after supabase/profile-management-migration.sql.
-- Allows selected internal/developer accounts to be hidden from the app staff list.

alter table public.profiles
add column if not exists hidden_from_staff boolean not null default false;

create index if not exists profiles_hidden_from_staff_idx on public.profiles(hidden_from_staff);

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow trusted SQL Editor, migrations, and service-role operations.
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
    and new.is_active = old.is_active
    and new.hidden_from_staff = old.hidden_from_staff
    and new.rejected_at is not distinct from old.rejected_at
    and new.rejected_by is not distinct from old.rejected_by
    and new.approved_at is not distinct from old.approved_at
    and new.approved_by is not distinct from old.approved_by
    and new.created_at = old.created_at
  then
    return new;
  end if;

  raise exception 'Only managers/admins can update profile approval, role, account status, or visibility fields';
end;
$$;
