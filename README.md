# Oasis Tasks

Oasis Tasks is a lightweight internal workplace task board for Oasis Dental staff. It helps receptionists, nurses, dentists, and managers create quick jobs, assign reminders, add updates, manage staff approvals, leave shift notes, search visible work, and export visible data for managers/admins.

## Tech Stack

- React, Vite, TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, RLS, Realtime
- Vercel-compatible static deployment

## Local Setup

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not commit real Supabase keys beyond the public anon key intended for browser use.

## Supabase Setup

Run SQL in this order from the Supabase SQL editor:

1. `supabase/schema.sql`
2. `supabase/profile-management-migration.sql`
3. `supabase/notifications-migration.sql`
4. `supabase/task-templates-migration.sql`
5. `supabase/saved-views-migration.sql`
6. `supabase/handover-migration.sql`
7. `supabase/workplace-categories-migration.sql`
8. `supabase/workspace-settings-migration.sql`

RLS is the source of truth. The UI hides manager/admin controls for normal staff, but database policies must remain enabled.

Task templates and saved views migrations are kept for compatibility with existing environments, but those product surfaces are currently hidden in the app.
Workspace settings let managers/admins customise task categories, staff display categories, and simple permission toggles. If the workspace settings migration has not been run, the app falls back to built-in defaults.
Location columns may still exist in older tables as legacy fields, but location is not used in the visible product.

## First Admin Approval

1. Register the first staff account through the app.
2. In Supabase, manually update that profile to `is_approved = true` and `role = 'admin'`.
3. Sign out and back in.
4. Use Team to approve future staff accounts.

## Vercel Deployment

1. Push the repo to GitHub.
2. Import the project in Vercel.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy and test direct route reloads such as `/my-tasks`, `/handover`, and `/settings`.

## Privacy Note

Oasis Tasks is designed for operational handover, not clinical records. Staff should use patient initials or internal references only. Do not enter full patient names, diagnosis details, treatment notes, or sensitive medical information.

## Common Troubleshooting

- Missing tables: run the migration files in order.
- User stuck pending: approve the profile from Team or manually approve the first admin in Supabase.
- Task creation blocked: sign out/in after approval so Auth and RLS state refresh.
- Notifications unavailable: run `supabase/notifications-migration.sql`.
- Build warning about chunk size: currently non-blocking; build still succeeds.
- Before staff trials, use `docs/CLEAN_START.md` to remove demo/test task data while keeping profiles.

## Verification

```bash
npm run lint
npm run build
```
