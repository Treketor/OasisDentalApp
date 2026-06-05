import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  createTaskTemplate as createTaskTemplateService,
  deactivateTaskTemplate as deactivateTaskTemplateService,
  getTaskTemplates,
  updateTaskTemplate as updateTaskTemplateService,
  type CreateTaskTemplateInput,
  type UpdateTaskTemplateInput,
} from '../lib/taskTemplates'
import type { TaskTemplate } from '../types/database'

export function useTaskTemplates(activeOnly = false) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await getTaskTemplates()
      setTemplates(activeOnly ? data.filter((template) => template.is_active) : data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task templates.')
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [activeOnly])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh()
    }, 0)

    const channel = supabase
      .channel(`task-templates-realtime-${activeOnly ? 'active' : 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_templates' }, () => {
        void refresh()
      })
      .subscribe()

    return () => {
      window.clearTimeout(timeoutId)
      void supabase.removeChannel(channel)
    }
  }, [activeOnly, refresh])

  const createTaskTemplate = useCallback(async (input: CreateTaskTemplateInput) => {
    const template = await createTaskTemplateService(input)
    setTemplates((current) => [template, ...current])
    return template
  }, [])

  const updateTaskTemplate = useCallback(async (templateId: string, updates: UpdateTaskTemplateInput) => {
    const template = await updateTaskTemplateService(templateId, updates)
    setTemplates((current) => current.map((item) => (item.id === templateId ? template : item)))
    return template
  }, [])

  const deactivateTaskTemplate = useCallback(async (templateId: string) => {
    const template = await deactivateTaskTemplateService(templateId)
    setTemplates((current) => current.map((item) => (item.id === templateId ? template : item)))
    return template
  }, [])

  return {
    data: templates,
    templates,
    loading,
    error,
    refresh,
    createTaskTemplate,
    updateTaskTemplate,
    deactivateTaskTemplate,
  }
}
