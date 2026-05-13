-- Oasis Tasks profile management migration.
-- Run this after the initial schema.sql to support manager/admin account workflows.

alter table public.profiles
add column if not exists is_active boolean not null default true,
add column if not exists rejected_at timestamptz,
add column if not exists rejected_by uuid references public.profiles(id),
add column if not exists approved_at timestamptz,
add column if not exists approved_by uuid references public.profiles(id);

create index if not exists profiles_is_approved_idx on public.profiles(is_approved);
create index if not exists profiles_is_active_idx on public.profiles(is_active);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_location_idx on public.profiles(location);

-- Keep profile approval/role/status changes restricted to managers/admins.
-- Normal users can only update their own full_name and location.
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
    and new.rejected_at is not distinct from old.rejected_at
    and new.rejected_by is not distinct from old.rejected_by
    and new.approved_at is not distinct from old.approved_at
    and new.approved_by is not distinct from old.approved_by
    and new.created_at = old.created_at
  then
    return new;
  end if;

  raise exception 'Only managers/admins can update profile approval, role, or account status fields';
end;
$$;

drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update
before update on public.profiles
for each row execute function public.guard_profile_update();

-- Policies below are repeated intentionally so this migration can repair an
-- incomplete local setup without needing to rerun the full schema.
drop policy if exists "Managers and admins can read all profiles" on public.profiles;
create policy "Managers and admins can read all profiles"
on public.profiles for select
to authenticated
using (public.current_user_is_manager_or_admin());

drop policy if exists "Managers and admins can update profiles" on public.profiles;
create policy "Managers and admins can update profiles"
on public.profiles for update
to authenticated
using (public.current_user_is_manager_or_admin())
with check (public.current_user_is_manager_or_admin());

-- We do not grant profile DELETE from the browser. Rejection/deactivation is
-- represented with is_active=false and rejected_at/rejected_by metadata.
