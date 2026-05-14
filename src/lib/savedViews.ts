import { supabase } from './supabase'
import type { SavedTaskView } from '../types/database'

export interface SavedTaskViewInput {
  name: string
  filters: Record<string, unknown>
  sort_key: string
  is_default?: boolean
}

export type SavedTaskViewUpdateInput = Partial<SavedTaskViewInput>

function mapSavedViewError(message: string) {
  if (message.includes('saved_task_views') && (message.includes('does not exist') || message.includes('schema cache'))) {
    return 'Saved views are not set up yet. Run supabase/saved-views-migration.sql.'
  }

  if (message.toLowerCase().includes('row-level security')) {
    return 'You can only manage your own saved task views.'
  }

  return 'Saved views could not be loaded or saved.'
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
    .order('name', { ascending: true })

  if (error) throw new Error(mapSavedViewError(error.message))
  return (data ?? []) as SavedTaskView[]
}

export async function createSavedTaskView(input: SavedTaskViewInput) {
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

export async function updateSavedTaskView(viewId: string, updates: SavedTaskViewUpdateInput) {
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name.trim()
  if (updates.filters !== undefined) payload.filters = updates.filters
  if (updates.sort_key !== undefined) payload.sort_key = updates.sort_key
  if (updates.is_default !== undefined) payload.is_default = updates.is_default

  const { data, error } = await supabase
    .from('saved_task_views')
    .update(payload)
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
  return updateSavedTaskView(viewId, { is_default: true })
}
