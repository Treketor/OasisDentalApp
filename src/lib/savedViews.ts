import { supabase } from './supabase'
import type { SavedTaskView } from '../types/database'

export interface CreateSavedTaskViewInput {
  name: string
  filters: Record<string, unknown>
  sort_key: string
  is_default?: boolean
}

export type UpdateSavedTaskViewInput = Partial<CreateSavedTaskViewInput>

function isMissingSavedViewsTable(message: string) {
  return message.includes('saved_task_views') && (message.includes('does not exist') || message.includes('schema cache'))
}

function mapSavedViewError(message: string) {
  if (isMissingSavedViewsTable(message)) {
    return 'Saved views are not set up yet. Run supabase/saved-views-migration.sql.'
  }

  if (message.toLowerCase().includes('row-level security')) {
    return 'You can only manage your own saved views.'
  }

  return 'Saved views could not be updated. Please try again.'
}

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('You must be signed in to manage saved views.')
  return user.id
}

export async function getSavedTaskViews() {
  const { data, error } = await supabase
    .from('saved_task_views')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) throw new Error(mapSavedViewError(error.message))
  return (data ?? []) as SavedTaskView[]
}

export async function createSavedTaskView(input: CreateSavedTaskViewInput) {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('saved_task_views')
    .insert({
      user_id: userId,
      name: input.name.trim(),
      filters: input.filters,
      sort_key: input.sort_key,
      is_default: input.is_default ?? false,
    })
    .select('*')
    .single()

  if (error) throw new Error(mapSavedViewError(error.message))
  return data as SavedTaskView
}

export async function updateSavedTaskView(viewId: string, updates: UpdateSavedTaskViewInput) {
  const { data, error } = await supabase
    .from('saved_task_views')
    .update({
      ...updates,
      name: updates.name?.trim(),
    })
    .eq('id', viewId)
    .select('*')
    .single()

  if (error) throw new Error(mapSavedViewError(error.message))
  return data as SavedTaskView
}

export async function deleteSavedTaskView(viewId: string) {
  const { error } = await supabase.from('saved_task_views').delete().eq('id', viewId)
  if (error) throw new Error(mapSavedViewError(error.message))
}

export async function setDefaultSavedTaskView(viewId: string) {
  const userId = await getCurrentUserId()
  const { error } = await supabase
    .from('saved_task_views')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true)

  if (error) throw new Error(mapSavedViewError(error.message))
  return updateSavedTaskView(viewId, { is_default: true })
}
