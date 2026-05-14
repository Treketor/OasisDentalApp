-- Oasis Tasks workplace category migration.
-- Run after supabase/schema.sql. Keeps old category values readable while
-- allowing lightweight workplace task categories going forward.

alter table public.tasks
drop constraint if exists tasks_category_check;

alter table public.tasks
add constraint tasks_category_check check (
  category in (
    'patient_follow_up',
    'lab',
    'admin',
    'clinical',
    'sterilisation',
    'referral',
    'call_back',
    'cleaning',
    'ordering',
    'room_setup',
    'stock',
    'maintenance',
    'follow_up',
    'other'
  )
);

alter table public.task_templates
drop constraint if exists task_templates_default_category_check;

alter table public.task_templates
add constraint task_templates_default_category_check check (
  default_category in (
    'patient_follow_up',
    'lab',
    'admin',
    'clinical',
    'sterilisation',
    'referral',
    'call_back',
    'cleaning',
    'ordering',
    'room_setup',
    'stock',
    'maintenance',
    'follow_up',
    'other'
  )
);

update public.task_templates
set
  name = case name
    when 'Patient follow-up call' then 'Call someone back'
    when 'Lab case check' then 'Check delivery'
    when 'Referral follow-up' then 'Follow up'
    when 'Sterilisation room task' then 'Clean area'
    when 'Dentist review required' then 'General reminder'
    when 'End-of-day admin handover' then 'Shift note'
    else name
  end,
  default_title = case name
    when 'Patient follow-up call' then 'Call someone back'
    when 'Lab case check' then 'Check delivery or order'
    when 'Referral follow-up' then 'Follow up on open item'
    when 'Sterilisation room task' then 'Clean area'
    when 'Dentist review required' then 'Remind staff member'
    when 'End-of-day admin handover' then 'Note for next shift'
    else default_title
  end,
  default_description = case name
    when 'Patient follow-up call' then 'Use initials or a short reference only. Add the next simple step.'
    when 'Lab case check' then 'Check whether the item has arrived or needs chasing.'
    when 'Referral follow-up' then 'Check the open item and leave a short update.'
    when 'Sterilisation room task' then 'Clean or reset the area for the team.'
    when 'Dentist review required' then 'Leave a short reminder without private medical details.'
    when 'End-of-day admin handover' then 'Leave a quick workplace note for the next shift.'
    else default_description
  end,
  default_category = case default_category
    when 'patient_follow_up' then 'call_back'
    when 'lab' then 'ordering'
    when 'clinical' then 'other'
    when 'sterilisation' then 'cleaning'
    when 'referral' then 'follow_up'
    else default_category
  end;
