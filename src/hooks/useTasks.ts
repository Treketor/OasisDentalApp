import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  completeTask as completeTaskService,
  createTask as createTaskService,
  deleteTask as deleteTaskService,
  getVisibleTasks,
  updateTask as updateTaskService,
  updateTaskStatus as updateTaskStatusService,
  type CreateTaskInput,
  type TaskWithProfiles,
  type UpdateTaskInput,
} from '../lib/tasks'
import type { TaskStatus } from '../types/database'

export function useTasks() {
  const [tasks, setTasks] = useState<TaskWithProfiles[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshTasks = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setTasks(await getVisibleTasks())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshTasks()
    }, 0)

    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        void refreshTasks()
      })
      .subscribe()

    return () => {
      window.clearTimeout(timeoutId)
      void supabase.removeChannel(channel)
    }
  }, [refreshTasks])

  const createTask = useCallback(
    async (input: CreateTaskInput) => {
      setError('')
      const task = await createTaskService(input)
      setTasks((current) => [task, ...current])
      return task
    },
    [],
  )

  const updateTask = useCallback(async (taskId: string, updates: UpdateTaskInput) => {
    setError('')
    const task = await updateTaskService(taskId, updates)
    setTasks((current) => current.map((item) => (item.id === taskId ? task : item)))
    return task
  }, [])

  const updateTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      const previous = tasks
      const completedAt = status === 'completed' ? new Date().toISOString() : null
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId ? { ...task, status, completed_at: completedAt } : task,
        ),
      )

      try {
        const task = await updateTaskStatusService(taskId, status)
        setTasks((current) => current.map((item) => (item.id === taskId ? task : item)))
        return task
      } catch (err) {
        setTasks(previous)
        setError(err instanceof Error ? err.message : 'Failed to update task status.')
        throw err
      }
    },
    [tasks],
  )

  const completeTask = useCallback(
    async (taskId: string) => {
      const previous = tasks
      const completedAt = new Date().toISOString()
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId ? { ...task, status: 'completed', completed_at: completedAt } : task,
        ),
      )

      try {
        const task = await completeTaskService(taskId)
        setTasks((current) => current.map((item) => (item.id === taskId ? task : item)))
        return task
      } catch (err) {
        setTasks(previous)
        setError(err instanceof Error ? err.message : 'Failed to complete task.')
        throw err
      }
    },
    [tasks],
  )

  const deleteTask = useCallback(async (taskId: string) => {
    setError('')
    await deleteTaskService(taskId)
    setTasks((current) => current.filter((task) => task.id !== taskId))
  }, [])

  return {
    tasks,
    loading,
    error,
    refreshTasks,
    createTask,
    updateTask,
    updateTaskStatus,
    completeTask,
    deleteTask,
  }
}
