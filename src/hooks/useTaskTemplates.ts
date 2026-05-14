import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  createTaskTemplate as createTaskTemplateService,
  deactivateTaskTemplate as deactivateTaskTemplateService,
  getActiveTaskTemplates,
  getTaskTemplates,
  updateTaskTemplate as updateTaskTemplateService,
  type TaskTemplateInput,
  type TaskTemplateUpdateInput,
} from '../lib/taskTemplates'
import type { TaskTemplate } from '../types/database'

export function useTaskTemplates(includeInactive = false) {
  const channelIdRef = useRef(crypto.randomUUID())
  const [data, setData] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setData(includeInactive ? await getTaskTemplates() : await getActiveTaskTemplates())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task templates.')
    } finally {
      setLoading(false)
    }
  }, [includeInactive])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0)
    const channel = supabase
      .channel(`task-templates-${includeInactive ? 'all' : 'active'}-${channelIdRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_templates' }, () => void refresh())
      .subscribe()

    return () => {
      window.clearTimeout(timeoutId)
      void supabase.removeChannel(channel)
    }
  }, [includeInactive, refresh])

  const create = useCallback(async (input: TaskTemplateInput) => {
    const template = await createTaskTemplateService(input)
    setData((current) => [template, ...current])
    return template
  }, [])

  const update = useCallback(async (templateId: string, updates: TaskTemplateUpdateInput) => {
    const template = await updateTaskTemplateService(templateId, updates)
    setData((current) => current.map((item) => (item.id === templateId ? template : item)))
    return template
  }, [])

  const deactivate = useCallback(async (templateId: string) => {
    const template = await deactivateTaskTemplateService(templateId)
    setData((current) =>
      includeInactive
        ? current.map((item) => (item.id === templateId ? template : item))
        : current.filter((item) => item.id !== templateId),
    )
    return template
  }, [includeInactive])

  return { data, loading, error, refresh, create, update, deactivate }
}
