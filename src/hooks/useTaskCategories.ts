import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  createTaskCategory,
  deactivateTaskCategory,
  deleteTaskCategory,
  getTaskCategories,
  reorderTaskCategories,
  updateTaskCategory,
  type CategoryInput,
} from '../lib/taskCategories'
import type { TaskCategorySetting } from '../types/database'

export function useTaskCategories(includeInactive = false) {
  const channelIdRef = useRef(crypto.randomUUID())
  const [data, setData] = useState<TaskCategorySetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await getTaskCategories(includeInactive))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task categories.')
    } finally {
      setLoading(false)
    }
  }, [includeInactive])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0)
    const channel = supabase
      .channel(`task-categories-${channelIdRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_categories' }, () => void refresh())
      .subscribe()
    return () => {
      window.clearTimeout(timeoutId)
      void supabase.removeChannel(channel)
    }
  }, [refresh])

  const create = useCallback(async (input: CategoryInput) => {
    const item = await createTaskCategory(input)
    setData((current) => [...current, item].sort((a, b) => a.sort_order - b.sort_order))
    return item
  }, [])

  const update = useCallback(async (id: string, updates: Partial<CategoryInput>) => {
    const item = await updateTaskCategory(id, updates)
    setData((current) => current.map((category) => (category.id === id ? item : category)))
    return item
  }, [])

  const deactivate = useCallback(async (id: string) => {
    const item = await deactivateTaskCategory(id)
    setData((current) => includeInactive ? current.map((category) => (category.id === id ? item : category)) : current.filter((category) => category.id !== id))
    return item
  }, [includeInactive])

  const remove = useCallback(async (id: string) => {
    await deleteTaskCategory(id)
    setData((current) => current.filter((category) => category.id !== id))
  }, [])

  const reorder = useCallback(async (ids: string[]) => {
    await reorderTaskCategories(ids)
    await refresh()
  }, [refresh])

  return { data, loading, error, refresh, create, update, deactivate, remove, reorder }
}
