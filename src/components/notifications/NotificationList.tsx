import type { NotificationWithRelations } from '../../lib/notifications'
import { formatRelativeTime } from '../../lib/dates'
import { cn } from '../../lib/cn'
import { EmptyState } from '../ui/EmptyState'
import { Skeleton } from '../ui/Skeleton'
import { AlertTriangle, ArrowRightLeft, Bell, CheckCircle2, Clock, MessageCircle, UserCheck, UserRound } from 'lucide-react'

interface NotificationListProps {
  notifications: NotificationWithRelations[]
  loading: boolean
  error: string
  onNotificationClick: (notification: NotificationWithRelations) => void
}

function formatNotificationCopy(notification: NotificationWithRelations) {
  const taskTitle = notification.task?.title
  const actorName = notification.actor?.full_name
  const taskLabel = taskTitle ? `"${taskTitle}"` : 'a task'

  switch (notification.type) {
    case 'task_assigned':
      return {
        title: taskTitle ? `You were assigned ${taskLabel}` : 'A task was assigned to you',
        summary: actorName ? `${actorName} assigned this to you.` : notification.body ?? 'Open it to see what needs doing.',
        context: 'Assigned task',
      }
    case 'task_reassigned':
      return {
        title: taskTitle ? `${taskLabel} was reassigned` : 'A task was reassigned',
        summary: actorName ? `${actorName} changed who this task is for.` : notification.body ?? 'The assignee changed.',
        context: 'Reassigned',
      }
    case 'task_commented':
      return {
        title: taskTitle ? `New update on ${taskLabel}` : 'New task update',
        summary: actorName ? `${actorName} added an update.` : notification.body ?? 'A task you are involved in has a new update.',
        context: 'Update added',
      }
    case 'task_completed':
      return {
        title: taskTitle ? `${taskLabel} was completed` : 'A task was completed',
        summary: actorName ? `${actorName} marked it complete.` : notification.body ?? 'This task is now done.',
        context: 'Completed',
      }
    case 'task_status_changed':
      return {
        title: taskTitle ? `${taskLabel} changed status` : 'Task status changed',
        summary: actorName ? `${actorName} updated the task status.` : notification.body ?? 'The status changed.',
        context: notification.body ?? 'Status changed',
      }
    case 'task_due_soon':
      return {
        title: taskTitle ? `${taskLabel} is due soon` : 'A task is due soon',
        summary: notification.body ?? 'Check whether this needs action today.',
        context: 'Due soon',
      }
    case 'task_overdue':
      return {
        title: taskTitle ? `${taskLabel} is overdue` : 'A task is overdue',
        summary: notification.body ?? 'This task needs attention.',
        context: 'Overdue',
      }
    case 'approval_granted':
      return {
        title: 'Your access was approved',
        summary: notification.body ?? 'You can now use Oasis Tasks.',
        context: 'Account',
      }
    default:
      return {
        title: notification.title,
        summary: notification.body ?? 'Open this notification for more detail.',
        context: 'Oasis Tasks',
      }
  }
}

function getNotificationTone(notification: NotificationWithRelations) {
  switch (notification.type) {
    case 'task_assigned':
      return {
        Icon: UserRound,
        card: notification.is_read ? 'border-blue-100 bg-blue-50/25' : 'border-blue-200 bg-blue-50',
        icon: 'bg-blue-100 text-blue-700',
        dot: 'bg-blue-500',
      }
    case 'task_reassigned':
      return {
        Icon: ArrowRightLeft,
        card: notification.is_read ? 'border-violet-100 bg-violet-50/25' : 'border-violet-200 bg-violet-50',
        icon: 'bg-violet-100 text-violet-700',
        dot: 'bg-violet-500',
      }
    case 'task_commented':
      return {
        Icon: MessageCircle,
        card: notification.is_read ? 'border-amber-100 bg-amber-50/25' : 'border-amber-200 bg-amber-50',
        icon: 'bg-amber-100 text-amber-700',
        dot: 'bg-amber-500',
      }
    case 'task_completed':
      return {
        Icon: CheckCircle2,
        card: notification.is_read ? 'border-emerald-100 bg-emerald-50/25' : 'border-emerald-200 bg-emerald-50',
        icon: 'bg-emerald-100 text-emerald-700',
        dot: 'bg-emerald-500',
      }
    case 'task_status_changed':
      return {
        Icon: Clock,
        card: notification.is_read ? 'border-accent/10 bg-accent/5' : 'border-accent/25 bg-accent/10',
        icon: 'bg-accent/15 text-accentDark',
        dot: 'bg-accent',
      }
    case 'task_due_soon':
      return {
        Icon: Clock,
        card: notification.is_read ? 'border-orange-100 bg-orange-50/25' : 'border-orange-200 bg-orange-50',
        icon: 'bg-orange-100 text-orange-700',
        dot: 'bg-orange-500',
      }
    case 'task_overdue':
      return {
        Icon: AlertTriangle,
        card: notification.is_read ? 'border-red-100 bg-red-50/25' : 'border-red-200 bg-red-50',
        icon: 'bg-red-100 text-red-700',
        dot: 'bg-red-500',
      }
    case 'approval_granted':
      return {
        Icon: UserCheck,
        card: notification.is_read ? 'border-green-100 bg-green-50/25' : 'border-green-200 bg-green-50',
        icon: 'bg-green-100 text-green-700',
        dot: 'bg-green-500',
      }
    default:
      return {
        Icon: Bell,
        card: notification.is_read ? 'border-border bg-surface' : 'border-accent/20 bg-accent/5',
        icon: 'bg-background text-accentDark',
        dot: 'bg-accent',
      }
  }
}

export function NotificationList({
  notifications,
  loading,
  error,
  onNotificationClick,
}: NotificationListProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (error) {
    return <p className="px-4 py-6 text-sm text-urgent">{error}</p>
  }

  if (notifications.length === 0) {
    return <EmptyState title="No notifications yet" message="Task updates and approvals will appear here." />
  }

  return (
    <div className="max-h-96 space-y-2 overflow-y-auto p-2">
      {notifications.slice(0, 8).map((notification) => {
        const copy = formatNotificationCopy(notification)
        const tone = getNotificationTone(notification)
        const Icon = tone.Icon

        return (
        <button
          key={notification.id}
          type="button"
          className={cn(
            'grid w-full grid-cols-[auto_1fr] gap-3 rounded-2xl border px-3 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm sm:grid-cols-[auto_1fr_auto]',
            tone.card,
          )}
          onClick={() => onNotificationClick(notification)}
        >
          <span className={cn('mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl', tone.icon)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 space-y-1">
            <span className="flex items-start gap-2">
              <span className="line-clamp-2 text-sm font-semibold leading-5 text-text">{copy.title}</span>
              {!notification.is_read ? <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', tone.dot)} aria-label="Unread" /> : null}
            </span>
            <span className="line-clamp-1 block text-sm leading-5 text-muted">{copy.summary}</span>
            <span className="block truncate text-xs font-medium text-muted">{copy.context}</span>
          </span>
          <span className="col-start-2 text-xs text-muted sm:col-start-auto">{formatRelativeTime(notification.created_at)}</span>
        </button>
      )})}
    </div>
  )
}
