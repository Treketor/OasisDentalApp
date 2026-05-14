# Deployment

## Supabase Project Setup

1. Create a Supabase project.
2. Copy the project URL and anon key into local `.env.local` and Vercel environment variables.
3. Run the SQL files in the Supabase SQL editor in this order:
   - `supabase/schema.sql`
   - `supabase/profile-management-migration.sql`
   - `supabase/notifications-migration.sql`
   - `supabase/task-templates-migration.sql`
   - `supabase/saved-views-migration.sql`
   - `supabase/handover-migration.sql`
   - `supabase/workplace-categories-migration.sql`
   - `supabase/workspace-settings-migration.sql`
4. Confirm RLS is enabled on app tables.

## Vercel Environment Variables

Add:

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Do not add service-role keys to the browser app.

## Approve The First Admin

1. Register the first account in the app.
2. In Supabase Table Editor or SQL editor, set that profile to:
   - `is_approved = true`
   - `is_active = true`
   - `role = 'admin'`
3. Sign out and back in.
4. Approve future users from the Team page.

## Production Smoke Test

- Register a test staff account.
- Approve it from an admin account.
- Create, assign, comment on, complete, and search a task.
- Create and resolve a handover note.
- Add a custom task category in Manage and create a task with it.
- Add a staff category and assign it to a staff profile.
- Toggle a workspace permission and confirm normal staff behavior changes.
- Change password from Account settings.
- Export CSV as manager/admin.
- Reload direct routes: `/`, `/my-tasks`, `/handover`, `/settings`.
- Test mobile layout in browser device tools.
- Clean demo data before staff trials using `docs/CLEAN_START.md`.

## Rollback Notes

Frontend rollback is a normal Vercel redeploy to a previous deployment. Database migrations in this project are additive and mostly use `create table if not exists`; avoid dropping tables in production without a separate backup and rollback plan.
