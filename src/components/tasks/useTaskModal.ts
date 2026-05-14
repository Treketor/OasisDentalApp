import { useContext } from 'react'
import { toast } from 'sonner'
import { TaskModalContext } from './TaskModalContext'

export function useTaskModal() {
  const context = useContext(TaskModalContext)
  if (!context) {
    return {
      openTask: (taskOrId: unknown) => {
        const taskId = typeof taskOrId === 'string'
          ? taskOrId
          : typeof taskOrId === 'object' && taskOrId && 'id' in taskOrId
            ? String(taskOrId.id)
            : ''

        if (taskId) {
          window.location.assign(`/tasks/${taskId}`)
          return
        }

        toast.error('Task could not be opened')
      },
      closeTask: () => undefined,
    }
  }
  return context
}
