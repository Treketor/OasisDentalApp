import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  createHandoverNote as createHandoverNoteService,
  deleteHandoverNote as deleteHandoverNoteService,
  getHandoverNotes,
  resolveHandoverNote as resolveHandoverNoteService,
  updateHandoverNote as updateHandoverNoteService,
  type CreateHandoverNoteInput,
  type HandoverFilters,
  type HandoverNoteWithProfile,
  type UpdateHandoverNoteInput,
} from '../lib/handover'

export function useHandoverNotes(filters: HandoverFilters = {}) {
  const { includeResolved, limit, location, shift_date } = filters
  const [notes, setNotes] = useState<HandoverNoteWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setNotes(await getHandoverNotes({ includeResolved, limit, location, shift_date }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load handover notes.')
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [includeResolved, limit, location, shift_date])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh()
    }, 0)

    const channel = supabase
      .channel('handover-notes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'handover_notes' }, () => {
        void refresh()
      })
      .subscribe()

    return () => {
      window.clearTimeout(timeoutId)
      void supabase.removeChannel(channel)
    }
  }, [refresh])

  const createHandoverNote = useCallback(async (input: CreateHandoverNoteInput) => {
    const note = await createHandoverNoteService(input)
    setNotes((current) => [note, ...current])
    return note
  }, [])

  const updateHandoverNote = useCallback(async (noteId: string, updates: UpdateHandoverNoteInput) => {
    const note = await updateHandoverNoteService(noteId, updates)
    setNotes((current) => current.map((item) => (item.id === noteId ? note : item)))
    return note
  }, [])

  const resolveHandoverNote = useCallback(async (noteId: string) => {
    const note = await resolveHandoverNoteService(noteId)
    setNotes((current) => current.map((item) => (item.id === noteId ? note : item)))
    return note
  }, [])

  const deleteHandoverNote = useCallback(async (noteId: string) => {
    await deleteHandoverNoteService(noteId)
    setNotes((current) => current.filter((note) => note.id !== noteId))
  }, [])

  return {
    data: notes,
    notes,
    loading,
    error,
    refresh,
    createHandoverNote,
    updateHandoverNote,
    resolveHandoverNote,
    deleteHandoverNote,
  }
}
