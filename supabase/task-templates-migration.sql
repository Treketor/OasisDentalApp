-- Oasis Tasks task templates migration.
-- Run after supabase/schema.sql.
-- Privacy note: templates must stay generic and must not encourage full patient names,
-- diagnosis details, treatment notes, or sensitive medical data.

create table if not exists public.task_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  default_title text not null,
  default_description text,
  default_priority text not null default 'normal',
  default_category text not null default 'other',
  default_location text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_templates_default_priority_check check (
    default_priority in ('low', 'normal', 'urgent')
  ),
  constraint task_templates_default_category_check check (
    default_category in (
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

create index if not exists task_templates_is_active_idx on public.task_templates(is_active);
create index if not exists task_templates_default_category_idx on public.task_templates(default_category);
create index if not exists task_templates_created_by_idx on public.task_templates(created_by);

drop trigger if exists task_templates_set_updated_at on public.task_templates;
create trigger task_templates_set_updated_at
before update on public.task_templates
for each row execute function public.set_updated_at();

alter table public.task_templates enable row level security;

drop policy if exists "Approved users can read active task templates" on public.task_templates;
create policy "Approved users can read active task templates"
on public.task_templates for select
to authenticated
using (public.current_user_is_approved() and is_active = true);

drop policy if exists "Managers and admins can read all task templates" on public.task_templates;
create policy "Managers and admins can read all task templates"
on public.task_templates for select
to authenticated
using (public.current_user_is_manager_or_admin());

drop policy if exists "Managers and admins can create task templates" on public.task_templates;
create policy "Managers and admins can create task templates"
on public.task_templates for insert
to authenticated
with check (
  public.current_user_is_approved()
  and public.current_user_is_manager_or_admin()
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists "Managers and admins can update task templates" on public.task_templates;
create policy "Managers and admins can update task templates"
on public.task_templates for update
to authenticated
using (public.current_user_is_approved() and public.current_user_is_manager_or_admin())
with check (public.current_user_is_approved() and public.current_user_is_manager_or_admin());

-- No delete policy. Templates are deactivated so historical usage remains understandable.

insert into public.task_templates (
  name,
  description,
  default_title,
  default_description,
  default_priority,
  default_category,
  default_location,
  is_active
)
values
  (
    'Patient follow-up call',
    'Generic callback reminder using initials or internal reference only.',
    'Follow up with patient ref',
    'Confirm contact attempt and next admin step. Use initials/internal reference only.',
    'normal',
    'patient_follow_up',
    'Reception',
    true
  ),
  (
    'Lab case check',
    'Check lab case status before the next appointment block.',
    'Check lab case status',
    'Confirm lab status, expected return, and whether the team needs an update.',
    'normal',
    'lab',
    null,
    true
  ),
  (
    'Referral follow-up',
    'Follow up an outstanding referral admin step.',
    'Follow up referral',
    'Check referral sent/received status and record the next operational action.',
    'normal',
    'referral',
    'Reception',
    true
  ),
  (
    'Sterilisation room task',
    'Operational sterilisation room reminder.',
    'Sterilisation room check',
    'Complete the room check and flag any stock or workflow issue.',
    'normal',
    'sterilisation',
    'Sterilisation',
    true
  ),
  (
    'Dentist review required',
    'Generic review reminder without clinical details.',
    'Dentist review required',
    'Ask the dentist to review the operational item. Do not include treatment notes.',
    'urgent',
    'clinical',
    null,
    true
  ),
  (
    'End-of-day admin handover',
    'Admin wrap-up item for the next shift.',
    'End-of-day admin handover',
    'List outstanding non-sensitive admin items for the next shift.',
    'normal',
    'admin',
    'Reception',
    true
  )
on conflict do nothing;
