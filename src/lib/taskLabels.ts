import type { TaskCategory, TaskPriority, TaskStatus } from '../types/database'
import { priorityLabels, statusLabels } from './labels'
export {
  categoryLabels,
  priorityLabels,
  roleLabels,
  statusLabels,
  formatEventTypeLabel,
  formatNotificationTypeLabel,
  formatRoleLabel,
  formatTaskCategoryLabel,
  formatTaskPriorityLabel,
  formatTaskStatusLabel,
} from './labels'
export { isDueToday, isThisWeek } from './dates'

export const taskStatuses = Object.keys(statusLabels) as TaskStatus[]
export const taskPriorities = Object.keys(priorityLabels) as TaskPriority[]
export const taskCategories: TaskCategory[] = [
  'call_back',
  'admin',
  'cleaning',
  'ordering',
  'room_setup',
  'stock',
  'maintenance',
  'follow_up',
  'other',
]

export function formatDate(value: string | null) {
  if (!value) return 'No date'
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatDateTime(value: string | null) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}
