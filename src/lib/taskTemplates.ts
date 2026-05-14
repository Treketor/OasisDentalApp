import { supabase } from './supabase'
import type { TaskCategory, TaskPriority, TaskTemplate } from '../types/database'

export interface TaskTemplateInput {
  name: string
  description?: string | null
  default_title: string
  default_description?: string | null
  default_priority: TaskPriority
  default_category: TaskCategory
  default_location?: string | null
  is_active?: boolean
}

export type TaskTemplateUpdateInput = Partial<TaskTemplateInput>

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function mapTemplateError(message: string) {
  if (message.includes('task_templates') && (message.includes('does not exist') || message.includes('schema cache'))) {
    return 'Task templates are not set up yet. Run supabase/task-templates-migration.sql.'
  }

  if (message.toLowerCase().includes('row-level security')) {
    return 'You do not have permission to manage task templates.'
  }

  return 'Task templates could not be loaded or saved.'
}

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('You must be signed in to manage task templates.')
  return user.id
}

function toPayload(input: TaskTemplateInput | TaskTemplateUpdateInput) {
  const payload: Record<string, unknown> = {}

  if (input.name !== undefined) payload.name = input.name.trim()
  if (input.description !== undefined) payload.description = cleanText(input.description)
  if (input.default_title !== undefined) payload.default_title = input.default_title.trim()
  if (input.default_description !== undefined) payload.default_description = cleanText(input.default_description)
  if (input.default_priority !== undefined) payload.default_priority = input.default_priority
  if (input.default_category !== undefined) payload.default_category = input.default_category
  if (input.default_location !== undefined) payload.default_location = cleanText(input.default_location)
  if (input.is_active !== undefined) payload.is_active = input.is_active

  return payload
}

export async function getTaskTemplates() {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .order('is_active', { ascending: false })
    .order('default_category', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(mapTemplateError(error.message))
  return (data ?? []) as TaskTemplate[]
}

export async function getActiveTaskTemplates() {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('is_active', true)
    .order('default_category', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(mapTemplateError(error.message))
  return (data ?? []) as TaskTemplate[]
}

export async function createTaskTemplate(input: TaskTemplateInput) {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('task_templates')
    .insert({ ...toPayload(input), created_by: userId })
    .select('*')
    .single()

  if (error) throw new Error(mapTemplateError(error.message))
  return data as TaskTemplate
}

export async function updateTaskTemplate(templateId: string, updates: TaskTemplateUpdateInput) {
  const { data, error } = await supabase
    .from('task_templates')
    .update(toPayload(updates))
    .eq('id', templateId)
    .select('*')
    .single()

  if (error) throw new Error(mapTemplateError(error.message))
  return data as TaskTemplate
}

export async function deactivateTaskTemplate(templateId: string) {
  return updateTaskTemplate(templateId, { is_active: false })
}
