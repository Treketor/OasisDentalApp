-- Oasis Tasks handover notes migration.
-- Run after supabase/schema.sql.
-- Handover notes are for operational/admin communication only.
-- Do not store full patient names, diagnosis details, treatment notes, or sensitive medical data.

create table if not exists public.handover_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  location text,
  shift_date date not null default current_date,
  created_by uuid not null references public.profiles(id),
  pinned boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists handover_notes_shift_date_idx on public.handover_notes(shift_date);
create index if not exists handover_notes_location_idx on public.handover_notes(location);
create index if not exists handover_notes_pinned_idx on public.handover_notes(pinned);
create index if not exists handover_notes_resolved_at_idx on public.handover_notes(resolved_at);

drop trigger if exists handover_notes_set_updated_at on public.handover_notes;
create trigger handover_notes_set_updated_at
before update on public.handover_notes
for each row execute function public.set_updated_at();

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
    and old.created_at = new.created_at
  then
    return new;
  end if;

  raise exception 'Only the creator, managers, and admins can edit handover note content';
end;
$$;

drop trigger if exists handover_notes_guard_update on public.handover_notes;
create trigger handover_notes_guard_update
before update on public.handover_notes
for each row execute function public.guard_handover_note_update();

alter table public.handover_notes enable row level security;

drop policy if exists "Approved users can read handover notes" on public.handover_notes;
create policy "Approved users can read handover notes"
on public.handover_notes for select
to authenticated
using (public.current_user_is_approved());

drop policy if exists "Approved users can create handover notes" on public.handover_notes;
create policy "Approved users can create handover notes"
on public.handover_notes for insert
to authenticated
with check (
  public.current_user_is_approved()
  and created_by = auth.uid()
  and resolved_at is null
  and resolved_by is null
);

drop policy if exists "Creator managers and admins can update handover notes" on public.handover_notes;
create policy "Creator managers and admins can update handover notes"
on public.handover_notes for update
to authenticated
using (
  public.current_user_is_approved()
  and (created_by = auth.uid() or public.current_user_is_manager_or_admin())
)
with check (
  public.current_user_is_approved()
  and (created_by = auth.uid() or public.current_user_is_manager_or_admin())
);

drop policy if exists "Approved users can resolve handover notes" on public.handover_notes;
create policy "Approved users can resolve handover notes"
on public.handover_notes for update
to authenticated
using (public.current_user_is_approved())
with check (public.current_user_is_approved());

drop policy if exists "Managers and admins can delete handover notes" on public.handover_notes;
create policy "Managers and admins can delete handover notes"
on public.handover_notes for delete
to authenticated
using (public.current_user_is_approved() and public.current_user_is_manager_or_admin());
