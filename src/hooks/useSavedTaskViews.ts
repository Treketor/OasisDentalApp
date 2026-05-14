import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../components/auth/useAuth'
import {
  createSavedTaskView as createSavedTaskViewService,
  deleteSavedTaskView as deleteSavedTaskViewService,
  getSavedTaskViews,
  setDefaultSavedTaskView as setDefaultSavedTaskViewService,
  updateSavedTaskView as updateSavedTaskViewService,
  type SavedTaskViewInput,
  type SavedTaskViewUpdateInput,
} from '../lib/savedViews'
import { supabase } from '../lib/supabase'
import type { SavedTaskView } from '../types/database'

export function useSavedTaskViews() {
  const { user } = useAuth()
  const channelIdRef = useRef(crypto.randomUUID())
  const [data, setData] = useState<SavedTaskView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!user) {
      setData([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      setData(await getSavedTaskViews())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved views.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0)
    if (!user) return () => window.clearTimeout(timeoutId)

    const channel = supabase
      .channel(`saved-task-views-${user.id}-${channelIdRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saved_task_views', filter: `user_id=eq.${user.id}` },
        () => void refresh(),
      )
      .subscribe()

    return () => {
      window.clearTimeout(timeoutId)
      void supabase.removeChannel(channel)
    }
  }, [refresh, user])

  const create = useCallback(async (input: SavedTaskViewInput) => {
    const view = await createSavedTaskViewService(input)
    setData((current) => [view, ...current])
    return view
  }, [])

  const update = useCallback(async (viewId: string, updates: SavedTaskViewUpdateInput) => {
    const view = await updateSavedTaskViewService(viewId, updates)
    setData((current) => current.map((item) => (item.id === viewId ? view : item)))
    return view
  }, [])

  const remove = useCallback(async (viewId: string) => {
    await deleteSavedTaskViewService(viewId)
    setData((current) => current.filter((item) => item.id !== viewId))
  }, [])

  const setDefault = useCallback(async (viewId: string) => {
    const view = await setDefaultSavedTaskViewService(viewId)
    setData((current) => current.map((item) => ({ ...item, is_default: item.id === view.id })))
    return view
  }, [])

  return { data, loading, error, refresh, create, update, delete: remove, setDefault }
}
