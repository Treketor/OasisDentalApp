-- Oasis Tasks note expiry migration.
-- Run after supabase/handover-migration.sql.
-- Adds optional expiry for workplace notes. Expired notes are hidden by the app UI.

alter table public.handover_notes
add column if not exists expires_at timestamptz;

create index if not exists handover_notes_expires_at_idx on public.handover_notes(expires_at);

create or replace function public.guard_handover_note_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.current_user_is_manager_or_admin() or old.created_by = auth.uid() then
    return new;
  end if;

  if old.id = new.id
    and old.title = new.title
    and coalesce(old.body, '') = coalesce(new.body, '')
    and coalesce(old.location, '') = coalesce(new.location, '')
    and old.shift_date = new.shift_date
    and old.created_by = new.created_by
    and old.pinned = new.pinned
    and coalesce(old.expires_at, '-infinity'::timestamptz) = coalesce(new.expires_at, '-infinity'::timestamptz)
    and old.created_at = new.created_at
  then
    return new;
  end if;

  raise exception 'Only the creator, managers, and admins can edit handover note content';
end;
$$;
