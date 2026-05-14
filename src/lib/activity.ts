import { formatDateTime, priorityLabels, statusLabels } from './taskLabels'
import { formatEventTypeLabel } from './labels'
import type { TaskEventWithProfile } from './tasks'
import type { TaskPriority, TaskStatus } from '../types/database'

function labelStatus(value: unknown) {
  return typeof value === 'string' && value in statusLabels
    ? statusLabels[value as TaskStatus]
    : String(value ?? 'Unknown')
}

function labelPriority(value: unknown) {
  return typeof value === 'string' && value in priorityLabels
    ? priorityLabels[value as TaskPriority]
    : String(value ?? 'Unknown')
}

function relativeTime(value: string) {
  const diffMs = new Date(value).getTime() - Date.now()
  const absSeconds = Math.abs(Math.round(diffMs / 1000))
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  if (absSeconds < 60) return rtf.format(Math.round(diffMs / 1000), 'second')
  if (absSeconds < 3600) return rtf.format(Math.round(diffMs / 60000), 'minute')
  if (absSeconds < 86400) return rtf.format(Math.round(diffMs / 3600000), 'hour')
  return rtf.format(Math.round(diffMs / 86400000), 'day')
}

export function getEventIconType(eventType: string) {
  if (eventType.includes('comment')) return 'comment'
  if (eventType.includes('complete')) return 'complete'
  if (eventType.includes('status')) return 'status'
  if (eventType.includes('assign')) return 'assign'
  if (eventType.includes('priority')) return 'priority'
  if (eventType.includes('due')) return 'due'
  return 'update'
}

export function getEventTone(eventType: string) {
  if (eventType.includes('complete')) return 'success'
  if (eventType.includes('cancel')) return 'muted'
  if (eventType.includes('priority')) return 'warning'
  if (eventType.includes('assign')) return 'accent'
  return 'default'
}

export function formatTaskEvent(event: TaskEventWithProfile) {
  const metadata = event.metadata ?? {}
  let message = formatEventTypeLabel(event.event_type)

  if (event.event_type === 'task_created') message = 'Task created'
  if (event.event_type === 'task_updated') message = 'Task updated'
  if (event.event_type === 'comment_added') message = 'Comment added'
  if (event.event_type === 'task_completed') message = 'Marked complete'
  if (event.event_type === 'task_cancelled') message = 'Task cancelled'
  if (event.event_type === 'status_changed') message = `Status changed to ${labelStatus(metadata.next_status)}`
  if (event.event_type === 'priority_changed') message = `Priority changed to ${labelPriority(metadata.next_priority)}`
  if (event.event_type === 'due_date_changed') message = 'Due date changed'
  if (event.event_type === 'task_assigned') message = 'Task assigned'
  if (event.event_type === 'task_reassigned') message = 'Task reassigned'
  if (event.event_type === 'task_unassigned') message = 'Task unassigned'
  if (event.event_type === 'task_deleted') message = 'Task deleted'

  return {
    message,
    actor: event.profile?.full_name ?? 'System',
    time: relativeTime(event.created_at),
    timestamp: formatDateTime(event.created_at),
    iconType: getEventIconType(event.event_type),
    tone: getEventTone(event.event_type),
  }
}
