# Oasis Tasks - Clinic Task Board

Oasis Tasks is a lightweight internal task board I built for a dental clinic (my partner's workplace), so the team can capture and track the small jobs that keep a busy practice running.

## What it does
- Quick jobs: receptionists, nurses, dentists and managers can create tasks in seconds.
- Reminders and updates: assign reminders and add progress updates to a job.
- Staff approvals: managers can approve and manage staff and their access.
- Shift notes: leave handover notes between shifts.
- Search: quickly find the work that is visible to you.
- Manager and admin export: export the visible data for managers and admins.
- Role-aware views: what each person sees and can do depends on their role.

## Tech
React, TypeScript, Vite, Tailwind CSS, React Router, Supabase (PostgreSQL), and Sonner for notifications. Deployed on Vercel.

## Running locally
\`\`\`bash
npm install
npm run dev
\`\`\`
Copy `.env.example` to `.env.local` and add your Supabase URL and anon key.

## Notes
A real internal tool built for a working dental practice, focused on being fast and simple for non-technical staff to use during a busy day.
