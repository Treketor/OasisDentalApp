-- Oasis Tasks task templates migration.
-- Run after schema.sql and profile-management-migration.sql.
-- Privacy note: templates must stay operational and generic. Do not include
-- full patient names, diagnosis details, treatment notes, or sensitive medical data.

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

-- No DELETE policy. Deactivation uses is_active=false so templates remain auditable.

insert into public.task_templates (
  name,
  description,
  default_title,
  default_description,
  default_priority,
  default_category,
  default_location
)
select *
from (values
  (
    'Patient follow-up call',
    'Generic follow-up reminder using initials or an internal reference only.',
    'Follow up with patient reference',
    'Contact patient using approved clinic details. Use initials/internal reference only in this task.',
    'normal',
    'patient_follow_up',
    null
  ),
  (
    'Lab case check',
    'Check status of a lab case or expected return.',
    'Check lab case status',
    'Confirm lab status, expected return, and any operational next step.',
    'normal',
    'lab',
    null
  ),
  (
    'Referral follow-up',
    'Follow up an external referral or correspondence item.',
    'Follow up referral',
    'Check referral status and record the non-sensitive next action.',
    'normal',
    'referral',
    null
  ),
  (
    'Sterilisation room task',
    'Operational reminder for sterilisation workflow checks.',
    'Sterilisation room check',
    'Complete the required room check and note any operational follow-up.',
    'normal',
    'sterilisation',
    'Sterilisation'
  ),
  (
    'Dentist review required',
    'A non-sensitive operational prompt for dentist review.',
    'Dentist review required',
    'Ask the dentist to review the operational item. Do not add clinical details here.',
    'urgent',
    'clinical',
    null
  ),
  (
    'End-of-day admin handover',
    'Operational admin items to carry into the next shift.',
    'End-of-day admin handover',
    'List open admin actions, messages, or non-sensitive reminders for the next shift.',
    'normal',
    'admin',
    'Reception'
  )
) as seed(
  name,
  description,
  default_title,
  default_description,
  default_priority,
  default_category,
  default_location
)
where not exists (
  select 1
  from public.task_templates existing
  where existing.name = seed.name
);
