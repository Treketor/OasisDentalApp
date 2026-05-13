import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TaskDetailPanel } from '../components/tasks/TaskDetailPanel'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { useAssignableProfiles } from '../hooks/useAssignableProfiles'
import { useTasks } from '../hooks/useTasks'
import { getTaskById, type TaskWithProfiles } from '../lib/tasks'

export function TaskDetailPage() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { profiles } = useAssignableProfiles()
  const { updateTask, updateTaskStatus, completeTask, deleteTask } = useTasks()
  const [task, setTask] = useState<TaskWithProfiles | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadTask() {
      if (!taskId) return
      setLoading(true)
      setError('')
      try {
        setTask(await getTaskById(taskId))
      } catch {
        setError('Task not found or unavailable.')
      } finally {
        setLoading(false)
      }
    }

    void loadTask()
  }, [taskId])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState title="Task not found or unavailable" message="You may not have access to this task, or it may have been removed." />
      </div>
    )
  }

  return (
    <TaskDetailPanel
      task={task}
      profiles={profiles}
      onClose={() => navigate('/my-tasks')}
      onUpdate={async (id, updates) => {
        const updated = await updateTask(id, updates)
        setTask(updated)
        return updated
      }}
      onStatusChange={async (id, status) => {
        const updated = await updateTaskStatus(id, status)
        setTask(updated)
        return updated
      }}
      onComplete={async (id) => {
        const updated = await completeTask(id)
        setTask(updated)
        return updated
      }}
      onDelete={async (id) => {
        await deleteTask(id)
        navigate('/my-tasks')
      }}
    />
  )
}
