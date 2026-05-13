-- Oasis Tasks in-app notifications migration.
-- Run after schema.sql and profile-management-migration.sql.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  type text not null,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (
    type in (
      'task_assigned',
      'task_reassigned',
      'task_status_changed',
      'task_completed',
      'task_commented',
      'task_due_soon',
      'task_overdue',
      'approval_granted'
    )
  )
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_task_id_idx on public.notifications(task_id);
create index if not exists notifications_is_read_idx on public.notifications(is_read);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can read their own notifications" on public.notifications;
create policy "Users can read their own notifications"
on public.notifications for select
to authenticated
using (user_id = auth.uid());

-- PostgreSQL RLS cannot restrict individual updated columns by itself.
-- The policy allows owners to update their notification rows; the app only
-- sends read-state updates. A server function can harden this later if needed.
drop policy if exists "Users can update their own notification read state" on public.notifications;
create policy "Users can update their own notification read state"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Approved users can insert task notifications" on public.notifications;
create policy "Approved users can insert task notifications"
on public.notifications for insert
to authenticated
with check (
  public.current_user_is_approved()
  and actor_id = auth.uid()
  and (
    (
      task_id is not null
      and public.can_access_task(task_id)
      and type in (
        'task_assigned',
        'task_reassigned',
        'task_status_changed',
        'task_completed',
        'task_commented',
        'task_due_soon',
        'task_overdue'
      )
    )
    or (
      task_id is null
      and type = 'approval_granted'
      and public.current_user_is_manager_or_admin()
    )
  )
);

-- No DELETE policy: notifications are intentionally retained.
