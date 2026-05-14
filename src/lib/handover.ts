import { supabase } from './supabase'
import type { HandoverNote, Profile } from '../types/database'

export interface HandoverNoteWithProfile extends HandoverNote {
  created_by_profile: Pick<Profile, 'id' | 'full_name' | 'role' | 'location'> | null
  resolved_by_profile: Pick<Profile, 'id' | 'full_name' | 'role' | 'location'> | null
}

export interface HandoverFilters {
  shiftDate?: string
  location?: string
  includeResolved?: boolean
  limit?: number
}

export interface HandoverNoteInput {
  title: string
  body?: string | null
  location?: string | null
  shift_date?: string
  pinned?: boolean
  expires_at?: string | null
}

export type HandoverNoteUpdateInput = Partial<
  Pick<HandoverNote, 'title' | 'body' | 'location' | 'shift_date' | 'pinned' | 'expires_at' | 'resolved_at' | 'resolved_by'>
>

const handoverSelect = `
  *,
  created_by_profile:profiles!handover_notes_created_by_fkey(id, full_name, role, location),
  resolved_by_profile:profiles!handover_notes_resolved_by_fkey(id, full_name, role, location)
`

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function mapHandoverError(message: string) {
  if (message.includes('handover_notes') && (message.includes('does not exist') || message.includes('schema cache'))) {
    return 'Handover notes are not set up yet. Run supabase/handover-migration.sql.'
  }

  if (message.includes('expires_at') || message.includes('schema cache')) {
    return 'Note expiry is not set up yet. Run supabase/note-expiry-migration.sql.'
  }

  if (message.toLowerCase().includes('row-level security')) {
    return 'You do not have permission to change this handover note.'
  }

  return 'Handover notes could not be loaded or saved.'
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

  if (filters.shiftDate) query = query.eq('shift_date', filters.shiftDate)
  if (filters.location) query = query.eq('location', filters.location)
  if (!filters.includeResolved) query = query.is('resolved_at', null)
  if (filters.limit) query = query.limit(filters.limit)

  const { data, error } = await query
  if (error) throw new Error(mapHandoverError(error.message))
  return (data ?? []) as HandoverNoteWithProfile[]
}

export async function createHandoverNote(input: HandoverNoteInput) {
  const userId = await getCurrentUserId()
  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    body: cleanText(input.body),
    location: cleanText(input.location),
    shift_date: input.shift_date,
    pinned: input.pinned ?? false,
    created_by: userId,
  }
  if (input.expires_at !== undefined) payload.expires_at = input.expires_at

  const { data, error } = await supabase
    .from('handover_notes')
    .insert(payload)
    .select(handoverSelect)
    .single()

  if (error) throw new Error(mapHandoverError(error.message))
  return data as HandoverNoteWithProfile
}

export async function updateHandoverNote(noteId: string, updates: HandoverNoteUpdateInput) {
  const payload: Record<string, unknown> = {}
  if (updates.title !== undefined) payload.title = updates.title.trim()
  if (updates.body !== undefined) payload.body = cleanText(updates.body)
  if (updates.location !== undefined) payload.location = cleanText(updates.location)
  if (updates.shift_date !== undefined) payload.shift_date = updates.shift_date
  if (updates.pinned !== undefined) payload.pinned = updates.pinned
  if (updates.expires_at !== undefined) payload.expires_at = updates.expires_at
  if (updates.resolved_at !== undefined) payload.resolved_at = updates.resolved_at
  if (updates.resolved_by !== undefined) payload.resolved_by = updates.resolved_by

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
