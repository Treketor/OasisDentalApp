import { supabase, supabaseEnv } from './supabase'
import type { Profile } from '../types/database'

export type HealthStatus = 'available' | 'missing' | 'unknown'

export interface HealthCheckResult {
  label: string
  status: HealthStatus
  detail: string
}

async function checkTable(table: string): Promise<HealthStatus> {
  const { error } = await supabase.from(table).select('*', { count: 'exact', head: true }).limit(1)
  if (!error) return 'available'
  if (error.message.includes('does not exist') || error.message.includes('schema cache')) return 'missing'
  return 'unknown'
}

export async function getSystemChecklist(profile: Profile | null): Promise<HealthCheckResult[]> {
  const [notifications, handover, taskCategories, staffCategories, permissions] = await Promise.all([
    checkTable('notifications'),
    checkTable('handover_notes'),
    checkTable('task_categories'),
    checkTable('staff_categories'),
    checkTable('workspace_permissions'),
  ])

  return [
    {
      label: 'Supabase connected',
      status: supabaseEnv.isConfigured ? 'available' : 'missing',
      detail: supabaseEnv.isConfigured ? 'Environment points to a Supabase project.' : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    },
    {
      label: 'Current user approved',
      status: profile?.is_approved ? 'available' : 'missing',
      detail: profile?.is_approved ? 'This staff profile can access app data.' : 'This staff profile is not approved.',
    },
    { label: 'Notifications table available', status: notifications, detail: 'Used for task and approval alerts.' },
    { label: 'Notes table available', status: handover, detail: 'Used for shift notes and team reminders.' },
    { label: 'Task categories available', status: taskCategories, detail: 'Used for admin-customisable task categories.' },
    { label: 'Staff categories available', status: staffCategories, detail: 'Used for staff display labels.' },
    { label: 'Permissions available', status: permissions, detail: 'Used for workspace permission toggles.' },
    {
      label: 'Realtime available',
      status: supabaseEnv.isConfigured ? 'unknown' : 'missing',
      detail: 'Realtime is verified by live subscriptions during app use.',
    },
    {
      label: 'Environment variables present',
      status: supabaseEnv.hasUrl && supabaseEnv.hasAnonKey ? 'available' : 'missing',
      detail: 'No secret values are displayed here.',
    },
  ]
}
