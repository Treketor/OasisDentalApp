import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useAssignableProfiles } from '../../hooks/useAssignableProfiles'
import { useTasks } from '../../hooks/useTasks'
import { getTaskById, type TaskWithProfiles } from '../../lib/tasks'
import { TaskDetailPanel } from './TaskDetailPanel'
import { TaskModalContext } from './TaskModalContext'

export function TaskModalProvider({ children }: { children: ReactNode }) {
  const { profiles } = useAssignableProfiles()
  const { tasks, updateTask, updateTaskStatus, completeTask, deleteTask } = useTasks()
  const [selectedTask, setSelectedTask] = useState<TaskWithProfiles | null>(null)

  const openTask = useCallback(
    (taskOrId: TaskWithProfiles | string) => {
      if (typeof taskOrId !== 'string') {
        setSelectedTask(taskOrId)
        return
      }

      const loadedTask = tasks.find((task) => task.id === taskOrId)
      if (loadedTask) {
        setSelectedTask(loadedTask)
        return
      }

      void getTaskById(taskOrId)
        .then(setSelectedTask)
        .catch(() => toast.error('Task could not be opened'))
    },
    [tasks],
  )

  const closeTask = useCallback(() => setSelectedTask(null), [])
  const liveTask = selectedTask ? tasks.find((task) => task.id === selectedTask.id) ?? selectedTask : null
  const value = useMemo(() => ({ openTask, closeTask }), [openTask, closeTask])

  return (
    <TaskModalContext.Provider value={value}>
      {children}
      {liveTask ? (
        <TaskDetailPanel
          key={`${liveTask.id}-${liveTask.updated_at}`}
          task={liveTask}
          profiles={profiles}
          onClose={closeTask}
          onUpdate={updateTask}
          onStatusChange={updateTaskStatus}
          onComplete={completeTask}
          onDelete={deleteTask}
        />
      ) : null}
    </TaskModalContext.Provider>
  )
}
