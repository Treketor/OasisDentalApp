import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createHandoverNote as createHandoverNoteService,
  deleteHandoverNote as deleteHandoverNoteService,
  getHandoverNotes,
  resolveHandoverNote as resolveHandoverNoteService,
  updateHandoverNote as updateHandoverNoteService,
  type HandoverFilters,
  type HandoverNoteInput,
  type HandoverNoteUpdateInput,
  type HandoverNoteWithProfile,
} from '../lib/handover'
import { supabase } from '../lib/supabase'

export function useHandoverNotes(filters: HandoverFilters = {}) {
  const channelIdRef = useRef(crypto.randomUUID())
  const [data, setData] = useState<HandoverNoteWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const filterKey = JSON.stringify(filters)
  const stableFilters = useMemo(() => JSON.parse(filterKey) as HandoverFilters, [filterKey])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setData(await getHandoverNotes(stableFilters))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load handover notes.')
    } finally {
      setLoading(false)
    }
  }, [stableFilters])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0)
    const channel = supabase
      .channel(`handover-notes-${channelIdRef.current}-${filterKey}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'handover_notes' }, () => void refresh())
      .subscribe()

    return () => {
      window.clearTimeout(timeoutId)
      void supabase.removeChannel(channel)
    }
  }, [filterKey, refresh])

  const create = useCallback(async (input: HandoverNoteInput) => {
    const note = await createHandoverNoteService(input)
    setData((current) => [note, ...current])
    return note
  }, [])

  const update = useCallback(async (noteId: string, updates: HandoverNoteUpdateInput) => {
    const note = await updateHandoverNoteService(noteId, updates)
    setData((current) => current.map((item) => (item.id === noteId ? note : item)))
    return note
  }, [])

  const resolve = useCallback(async (noteId: string) => {
    const note = await resolveHandoverNoteService(noteId)
    setData((current) => current.map((item) => (item.id === noteId ? note : item)))
    return note
  }, [])

  const remove = useCallback(async (noteId: string) => {
    await deleteHandoverNoteService(noteId)
    setData((current) => current.filter((item) => item.id !== noteId))
  }, [])

  return { data, loading, error, refresh, create, update, resolve, delete: remove }
}
