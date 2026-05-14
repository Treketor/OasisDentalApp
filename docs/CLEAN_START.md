# Clean Start Before Staff Trial

Use these snippets only when preparing a fresh trial environment. Do not run them on production after real staff data exists.

These snippets keep staff profiles and the admin account, but remove demo task/workflow data.

```sql
delete from public.notifications;
delete from public.task_events;
delete from public.task_comments;
delete from public.tasks;
delete from public.handover_notes;
delete from public.saved_task_views;
```

Optional: deactivate demo templates you do not want staff to see.

```sql
update public.task_templates
set is_active = false
where name ilike '%demo%'
   or name ilike '%test%';
```

Before inviting staff:

- Keep at least one approved admin account.
- Templates and saved views are currently hidden in the product UI.
- Create one simple test task, then delete it.
- Confirm staff registration and approval still work.
