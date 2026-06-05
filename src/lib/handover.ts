import { supabase } from './supabase'
import type { HandoverNote, Profile } from '../types/database'

export interface HandoverNoteWithProfile extends HandoverNote {
  created_by_profile: Pick<Profile, 'id' | 'full_name' | 'role' | 'location'> | null
  resolved_by_profile: Pick<Profile, 'id' | 'full_name' | 'role' | 'location'> | null
}

export interface HandoverFilters {
  shift_date?: string
  location?: string
  includeResolved?: boolean
  limit?: number
}

export interface CreateHandoverNoteInput {
  title: string
  body?: string | null
  location?: string | null
  pinned?: boolean
  shift_date?: string
}

export type UpdateHandoverNoteInput = Partial<
  Pick<HandoverNote, 'title' | 'body' | 'location' | 'pinned' | 'resolved_at' | 'resolved_by' | 'shift_date'>
>

const handoverSelect = `
  *,
  created_by_profile:profiles!handover_notes_created_by_fkey(id, full_name, role, location),
  resolved_by_profile:profiles!handover_notes_resolved_by_fkey(id, full_name, role, location)
`

function normalizeText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function isMissingHandoverTable(message: string) {
  return message.includes('handover_notes') && (message.includes('does not exist') || message.includes('schema cache'))
}

function mapHandoverError(message: string) {
  if (isMissingHandoverTable(message)) {
    return 'Handover notes are not set up yet. Run supabase/handover-migration.sql.'
  }

  if (message.toLowerCase().includes('row-level security')) {
    return 'You do not have permission to update that handover note.'
  }

  return 'Handover notes could not be updated. Please try again.'
}

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('You must be signed in to manage handover notes.')
  return user.id
}

export async function getHandoverNotes(filters: HandoverFilters = {}) {
  let query = supabase
    .from('handover_notes')
    .select(handoverSelect)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.shift_date) query = query.eq('shift_date', filters.shift_date)
  if (filters.location) query = query.eq('location', filters.location)
  if (!filters.includeResolved) query = query.is('resolved_at', null)
  if (filters.limit) query = query.limit(filters.limit)

  const { data, error } = await query
  if (error) throw new Error(mapHandoverError(error.message))
  return (data ?? []) as HandoverNoteWithProfile[]
}

export async function createHandoverNote(input: CreateHandoverNoteInput) {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('handover_notes')
    .insert({
      title: input.title.trim(),
      body: normalizeText(input.body),
      location: normalizeText(input.location),
      pinned: input.pinned ?? false,
      shift_date: input.shift_date,
      created_by: userId,
    })
    .select(handoverSelect)
    .single()

  if (error) throw new Error(mapHandoverError(error.message))
  return data as HandoverNoteWithProfile
}

export async function updateHandoverNote(noteId: string, updates: UpdateHandoverNoteInput) {
  const payload: Record<string, unknown> = { ...updates }
  if ('title' in updates) payload.title = updates.title?.trim()
  if ('body' in updates) payload.body = normalizeText(updates.body)
  if ('location' in updates) payload.location = normalizeText(updates.location)

  const { data, error } = await supabase
    .from('handover_notes')
    .update(payload)
    .eq('id', noteId)
    .select(handoverSelect)
    .single()

  if (error) throw new Error(mapHandoverError(error.message))
  return data as HandoverNoteWithProfile
}

export async function resolveHandoverNote(noteId: string) {
  const userId = await getCurrentUserId()
  return updateHandoverNote(noteId, {
    resolved_at: new Date().toISOString(),
    resolved_by: userId,
  })
}

export async function deleteHandoverNote(noteId: string) {
  const { error } = await supabase.from('handover_notes').delete().eq('id', noteId)
  if (error) throw new Error(mapHandoverError(error.message))
}
