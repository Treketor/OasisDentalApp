import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { createTaskOverdueNotification } from '../lib/notifications'
import { isOverdue } from '../lib/dates'
import {
  completeTask as completeTaskService,
  createTask as createTaskService,
  deleteTask as deleteTaskService,
  getVisibleTasks,
  getTaskById,
  updateTask as updateTaskService,
  updateTaskStatus as updateTaskStatusService,
  type CreateTaskInput,
  type TaskWithProfiles,
  type UpdateTaskInput,
} from '../lib/tasks'
import type { TaskStatus } from '../types/database'

export function useTasks() {
  const channelNameRef = useRef(`tasks-realtime-${crypto.randomUUID()}`)
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
      .channel(channelNameRef.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        void refreshTasks()
      })
      .subscribe()

    return () => {
      window.clearTimeout(timeoutId)
      void supabase.removeChannel(channel)
    }
  }, [refreshTasks])

  useEffect(() => {
    async function notifyOverdueTasks() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const todayKey = new Date().toISOString().slice(0, 10)
      const overdueTasks = tasks.filter((task) =>
        task.status !== 'completed'
        && task.status !== 'cancelled'
        && isOverdue(task.due_date)
        && (task.assigned_to === user.id || task.created_by === user.id),
      )

      overdueTasks.forEach((task) => {
        const storageKey = `oasis-overdue-notified:${todayKey}:${task.id}:${user.id}`
        if (window.localStorage.getItem(storageKey)) return
        window.localStorage.setItem(storageKey, '1')
        void createTaskOverdueNotification(task.id, user.id)
      })
    }

    if (tasks.length > 0) void notifyOverdueTasks()
  }, [tasks])

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

  const getTask = useCallback(async (taskId: string) => {
    return getTaskById(taskId)
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
    getTask,
  }
}
