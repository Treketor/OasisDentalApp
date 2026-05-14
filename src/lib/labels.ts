import type { NotificationType, TaskCategory, TaskPriority, TaskStatus, UserRole } from '../types/database'

export const roleLabels: Record<UserRole, string> = {
  receptionist: 'Receptionist',
  nurse: 'Nurse',
  dentist: 'Dentist',
  manager: 'Manager',
  admin: 'Admin',
}

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

export const categoryLabels: Record<string, string> = {
  patient_follow_up: 'Follow-up',
  lab: 'Admin',
  admin: 'Admin',
  clinical: 'Other',
  sterilisation: 'Cleaning',
  referral: 'Follow-up',
  call_back: 'Call back',
  cleaning: 'Cleaning',
  ordering: 'Ordering',
  room_setup: 'Room setup',
  stock: 'Stock',
  maintenance: 'Maintenance',
  follow_up: 'Follow-up',
  other: 'Other',
}

export const notificationTypeLabels: Record<NotificationType, string> = {
  task_assigned: 'Task assigned',
  task_reassigned: 'Task reassigned',
  task_status_changed: 'Task status changed',
  task_completed: 'Task completed',
  task_commented: 'Task commented',
  task_due_soon: 'Task due soon',
  task_overdue: 'Task overdue',
  approval_granted: 'Access approved',
}

export function formatRoleLabel(role: UserRole | string | null | undefined) {
  return role && role in roleLabels ? roleLabels[role as UserRole] : 'Staff'
}

export function formatTaskStatusLabel(status: TaskStatus | string | null | undefined) {
  return status && status in statusLabels ? statusLabels[status as TaskStatus] : 'Unknown'
}

export function formatTaskPriorityLabel(priority: TaskPriority | string | null | undefined) {
  return priority && priority in priorityLabels ? priorityLabels[priority as TaskPriority] : 'Normal'
}

export function formatTaskCategoryLabel(category: TaskCategory | string | null | undefined) {
  return category && category in categoryLabels ? categoryLabels[category as TaskCategory] : 'Other'
}

export function formatNotificationTypeLabel(type: NotificationType | string | null | undefined) {
  return type && type in notificationTypeLabels ? notificationTypeLabels[type as NotificationType] : 'Notification'
}

export function formatEventTypeLabel(eventType: string | null | undefined) {
  if (!eventType) return 'Activity'
  return eventType
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
