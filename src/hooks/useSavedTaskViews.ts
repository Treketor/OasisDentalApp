import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../components/auth/useAuth'
import { supabase } from '../lib/supabase'
import {
  createSavedTaskView as createSavedTaskViewService,
  deleteSavedTaskView as deleteSavedTaskViewService,
  getSavedTaskViews,
  setDefaultSavedTaskView as setDefaultSavedTaskViewService,
  updateSavedTaskView as updateSavedTaskViewService,
  type CreateSavedTaskViewInput,
  type UpdateSavedTaskViewInput,
} from '../lib/savedViews'
import type { SavedTaskView } from '../types/database'

export function useSavedTaskViews() {
  const { profile } = useAuth()
  const [views, setViews] = useState<SavedTaskView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    setError('')

    try {
      setViews(await getSavedTaskViews())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved views.')
      setViews([])
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh()
    }, 0)

    if (!profile?.id) {
      return () => window.clearTimeout(timeoutId)
    }

    const channel = supabase
      .channel(`saved-task-views-${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saved_task_views', filter: `user_id=eq.${profile.id}` },
        () => {
          void refresh()
        },
      )
      .subscribe()

    return () => {
      window.clearTimeout(timeoutId)
      void supabase.removeChannel(channel)
    }
  }, [profile?.id, refresh])

  const createSavedTaskView = useCallback(async (input: CreateSavedTaskViewInput) => {
    const view = await createSavedTaskViewService(input)
    setViews((current) => [view, ...current.map((item) => (view.is_default ? { ...item, is_default: false } : item))])
    return view
  }, [])

  const updateSavedTaskView = useCallback(async (viewId: string, updates: UpdateSavedTaskViewInput) => {
    const view = await updateSavedTaskViewService(viewId, updates)
    setViews((current) => current.map((item) => (item.id === viewId ? view : item)))
    return view
  }, [])

  const deleteSavedTaskView = useCallback(async (viewId: string) => {
    await deleteSavedTaskViewService(viewId)
    setViews((current) => current.filter((view) => view.id !== viewId))
  }, [])

  const setDefaultSavedTaskView = useCallback(async (viewId: string) => {
    const view = await setDefaultSavedTaskViewService(viewId)
    setViews((current) => current.map((item) => ({ ...item, is_default: item.id === view.id })))
    return view
  }, [])

  return {
    data: views,
    views,
    loading,
    error,
    refresh,
    createSavedTaskView,
    updateSavedTaskView,
    deleteSavedTaskView,
    setDefaultSavedTaskView,
  }
}
