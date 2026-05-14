import { supabase } from './supabase'
import { fallbackTaskCategories, isMissingSettingsTable } from './workspaceSettings'
import type { TaskCategorySetting } from '../types/database'

export interface CategoryInput {
  name: string
  slug?: string
  color?: string | null
  icon?: string | null
  sort_order?: number
  is_active?: boolean
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'category'
}

function clean(input: CategoryInput) {
  return {
    name: input.name.trim(),
    slug: slugify(input.slug || input.name),
    color: input.color || null,
    icon: input.icon || null,
    sort_order: input.sort_order ?? 0,
    is_active: input.is_active ?? true,
  }
}

function categoryError(message: string) {
  if (isMissingSettingsTable(message)) return 'Task categories are using built-in defaults until workspace settings migration is run.'
  if (message.toLowerCase().includes('row-level security')) return 'Only managers and admins can manage task categories.'
  return 'Task categories could not be saved.'
}

export async function getTaskCategories(includeInactive = false) {
  const query = supabase.from('task_categories').select('*').order('sort_order').order('name')
  if (!includeInactive) query.eq('is_active', true)
  const { data, error } = await query
  if (error) {
    if (isMissingSettingsTable(error.message)) return fallbackTaskCategories
    throw new Error(categoryError(error.message))
  }
  return (data ?? []) as TaskCategorySetting[]
}

export async function createTaskCategory(input: CategoryInput) {
  const { data, error } = await supabase.from('task_categories').insert(clean(input)).select('*').single()
  if (error) throw new Error(categoryError(error.message))
  return data as TaskCategorySetting
}

export async function updateTaskCategory(id: string, updates: Partial<CategoryInput>) {
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name.trim()
  if (updates.slug !== undefined || updates.name !== undefined) payload.slug = slugify(updates.slug || updates.name || '')
  if (updates.color !== undefined) payload.color = updates.color || null
  if (updates.icon !== undefined) payload.icon = updates.icon || null
  if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order
  if (updates.is_active !== undefined) payload.is_active = updates.is_active
  const { data, error } = await supabase.from('task_categories').update(payload).eq('id', id).select('*').single()
  if (error) throw new Error(categoryError(error.message))
  return data as TaskCategorySetting
}

export async function deactivateTaskCategory(id: string) {
  return updateTaskCategory(id, { is_active: false })
}

export async function deleteTaskCategory(id: string) {
  const { error } = await supabase.from('task_categories').delete().eq('id', id)
  if (error) throw new Error(categoryError(error.message))
}

export async function reorderTaskCategories(ids: string[]) {
  await Promise.all(ids.map((id, index) => updateTaskCategory(id, { sort_order: (index + 1) * 10 })))
}
