import type { TaskCategory, TaskPriority, TaskStatus, UserRole } from '../types/database'
export { isDueToday, isThisWeek } from './dates'

export const statusLabels: Record<TaskStatus, string> = {
  new: 'New',
  in_progress: 'In progress',
  waiting: 'Waiting',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const priorityLabels: Record<TaskPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  urgent: 'Urgent',
}

export const categoryLabels: Record<TaskCategory, string> = {
  patient_follow_up: 'Patient follow-up',
  lab: 'Lab',
  admin: 'Admin',
  clinical: 'Clinical',
  sterilisation: 'Sterilisation',
  referral: 'Referral',
  other: 'Other',
}

export const roleLabels: Record<UserRole, string> = {
  receptionist: 'Receptionist',
  nurse: 'Nurse',
  dentist: 'Dentist',
  manager: 'Manager',
  admin: 'Admin',
}

export const taskStatuses = Object.keys(statusLabels) as TaskStatus[]
export const taskPriorities = Object.keys(priorityLabels) as TaskPriority[]
export const taskCategories = Object.keys(categoryLabels) as TaskCategory[]

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
