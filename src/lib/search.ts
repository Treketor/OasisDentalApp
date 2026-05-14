import { supabase } from './supabase'
import { categoryLabels, formatDate, statusLabels, roleLabels } from './taskLabels'
import { getTaskCategories } from './taskCategories'
import { getTaskCategoryName } from './workspaceSettings'
import type { SearchResult, SearchResultsByGroup } from '../types/search'
import type { Profile, Task, TaskTemplate } from '../types/database'
import type { HandoverNoteWithProfile } from './handover'
import type { TaskWithProfiles } from './tasks'

const limit = 5

function isMissingOptionalTable(message: string) {
  return message.includes('does not exist') || message.includes('schema cache')
}

function cleanQuery(query: string) {
  return query.trim().replaceAll('%', '').replaceAll('_', '')
}

function pattern(query: string) {
  return `%${cleanQuery(query)}%`
}

function taskToResult(task: TaskWithProfiles | Task, categories: Awaited<ReturnType<typeof getTaskCategories>> = []): SearchResult {
  const assigned = 'assigned_to_profile' in task ? task.assigned_to_profile?.full_name : null
  return {
    id: task.id,
    type: 'task',
    title: task.title,
    subtitle: `${statusLabels[task.status]} - ${getTaskCategoryName(categories, task.category) || categoryLabels[task.category]}${assigned ? ` - ${assigned}` : ''}`,
    metadata: { status: task.status, category: task.category, priority: task.priority },
    href: `/tasks/${task.id}`,
  }
}

function handoverToResult(note: HandoverNoteWithProfile): SearchResult {
  return {
    id: note.id,
    type: 'handover',
    title: note.title,
    subtitle: `${formatDate(note.shift_date)}${note.pinned ? ' - Pinned' : ''}`,
    metadata: { shift_date: note.shift_date, pinned: note.pinned },
    href: `/handover?note=${note.id}`,
  }
}

function profileToResult(profile: Profile): SearchResult {
  return {
    id: profile.id,
    type: 'profile',
    title: profile.full_name,
    subtitle: roleLabels[profile.role],
    metadata: { role: profile.role },
    href: '/team',
  }
}

function templateToResult(template: TaskTemplate): SearchResult {
  return {
    id: template.id,
    type: 'template',
    title: template.name,
    subtitle: `${template.default_title} - ${categoryLabels[template.default_category]}`,
    metadata: { category: template.default_category },
    href: `/create?template=${template.id}`,
  }
}

export async function searchTasks(query: string) {
  const value = cleanQuery(query)
  if (value.length < 2) return []

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      created_by_profile:profiles!tasks_created_by_fkey(id, full_name, email, role),
      assigned_to_profile:profiles!tasks_assigned_to_fkey(id, full_name, email, role)
    `)
    .or(`title.ilike.${pattern(value)},description.ilike.${pattern(value)},patient_reference.ilike.${pattern(value)},category.ilike.${pattern(value)},status.ilike.${pattern(value)}`)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) return []
  const categories = await getTaskCategories().catch(() => [])
  return ((data ?? []) as TaskWithProfiles[]).map((task) => taskToResult(task, categories))
}

export async function searchHandoverNotes(query: string) {
  const value = cleanQuery(query)
  if (value.length < 2) return []

  const { data, error } = await supabase
    .from('handover_notes')
    .select(`
      *,
      created_by_profile:profiles!handover_notes_created_by_fkey(id, full_name, role),
      resolved_by_profile:profiles!handover_notes_resolved_by_fkey(id, full_name, role)
    `)
    .or(`title.ilike.${pattern(value)},body.ilike.${pattern(value)}`)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (!isMissingOptionalTable(error.message)) console.warn('Handover search failed')
    return []
  }

  return ((data ?? []) as HandoverNoteWithProfile[]).map(handoverToResult)
}

export async function searchProfiles(query: string) {
  const value = cleanQuery(query)
  if (value.length < 2) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_approved', true)
    .or(`full_name.ilike.${pattern(value)},role.ilike.${pattern(value)}`)
    .order('full_name', { ascending: true })
    .limit(limit)

  if (error) return []
  return ((data ?? []) as Profile[]).map(profileToResult)
}

export async function searchTaskTemplates(query: string) {
  const value = cleanQuery(query)
  if (value.length < 2) return []

  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('is_active', true)
    .or(`name.ilike.${pattern(value)},default_title.ilike.${pattern(value)},default_category.ilike.${pattern(value)}`)
    .order('name', { ascending: true })
    .limit(limit)

  if (error) {
    if (!isMissingOptionalTable(error.message)) console.warn('Template search failed')
    return []
  }

  return ((data ?? []) as TaskTemplate[]).map(templateToResult)
}

export async function searchAll(query: string): Promise<SearchResultsByGroup> {
  const [tasks, handover, profiles] = await Promise.all([
    searchTasks(query),
    searchHandoverNotes(query),
    searchProfiles(query),
  ])

  return { tasks, handover, profiles, templates: [] }
}
