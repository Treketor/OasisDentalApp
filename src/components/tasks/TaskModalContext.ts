import { createContext } from 'react'
import type { TaskWithProfiles } from '../../lib/tasks'

export interface TaskModalContextValue {
  openTask: (taskOrId: TaskWithProfiles | string) => void
  closeTask: () => void
}

export const TaskModalContext = createContext<TaskModalContextValue | undefined>(undefined)
