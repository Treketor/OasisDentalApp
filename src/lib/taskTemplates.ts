import { supabase } from './supabase'
import type { TaskCategory, TaskPriority, TaskTemplate } from '../types/database'

export interface CreateTaskTemplateInput {
  name: string
  description?: string | null
  default_title: string
  default_description?: string | null
  default_priority: TaskPriority
  default_category: TaskCategory
  default_location?: string | null
  is_active?: boolean
}

export type UpdateTaskTemplateInput = Partial<CreateTaskTemplateInput>

function normalizeText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function isMissingTaskTemplatesTable(message: string) {
  return message.includes('task_templates') && (message.includes('does not exist') || message.includes('schema cache'))
}

function mapTaskTemplateError(message: string) {
  if (isMissingTaskTemplatesTable(message)) {
    return 'Task templates are not set up yet. Run supabase/task-templates-migration.sql.'
  }

  if (message.toLowerCase().includes('row-level security')) {
    return 'You do not have permission to manage task templates.'
  }

  return 'Task templates could not be saved. Please try again.'
}

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('You must be signed in to manage task templates.')
  return user.id
}

export async function getTaskTemplates() {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name', { ascending: true })

  if (error) throw new Error(mapTaskTemplateError(error.message))
  return (data ?? []) as TaskTemplate[]
}

export async function getActiveTaskTemplates() {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('is_active', true)
    .order('default_category', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(mapTaskTemplateError(error.message))
  return (data ?? []) as TaskTemplate[]
}

export async function createTaskTemplate(input: CreateTaskTemplateInput) {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('task_templates')
    .insert({
      name: input.name.trim(),
      description: normalizeText(input.description),
      default_title: input.default_title.trim(),
      default_description: normalizeText(input.default_description),
      default_priority: input.default_priority,
      default_category: input.default_category,
      default_location: normalizeText(input.default_location),
      is_active: input.is_active ?? true,
      created_by: userId,
    })
    .select('*')
    .single()

  if (error) throw new Error(mapTaskTemplateError(error.message))
  return data as TaskTemplate
}

export async function updateTaskTemplate(templateId: string, updates: UpdateTaskTemplateInput) {
  const payload: Record<string, unknown> = { ...updates }
  if ('name' in updates) payload.name = updates.name?.trim()
  if ('description' in updates) payload.description = normalizeText(updates.description)
  if ('default_title' in updates) payload.default_title = updates.default_title?.trim()
  if ('default_description' in updates) payload.default_description = normalizeText(updates.default_description)
  if ('default_location' in updates) payload.default_location = normalizeText(updates.default_location)

  const { data, error } = await supabase
    .from('task_templates')
    .update(payload)
    .eq('id', templateId)
    .select('*')
    .single()

  if (error) throw new Error(mapTaskTemplateError(error.message))
  return data as TaskTemplate
}

export async function deactivateTaskTemplate(templateId: string) {
  return updateTaskTemplate(templateId, { is_active: false })
}
