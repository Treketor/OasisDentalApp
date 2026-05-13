import type { NotificationWithRelations } from '../../lib/notifications'
import { formatRelativeTime } from '../../lib/dates'
import { EmptyState } from '../ui/EmptyState'
import { Skeleton } from '../ui/Skeleton'

interface NotificationListProps {
  notifications: NotificationWithRelations[]
  loading: boolean
  error: string
  onNotificationClick: (notification: NotificationWithRelations) => void
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
    <div className="max-h-96 overflow-y-auto">
      {notifications.map((notification) => (
        <button
          key={notification.id}
          type="button"
          className={`block w-full border-b border-border px-4 py-3 text-left transition last:border-b-0 hover:bg-background ${
            notification.is_read ? 'bg-surface' : 'bg-accent/5'
          }`}
          onClick={() => onNotificationClick(notification)}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-text">{notification.title}</p>
            {!notification.is_read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" /> : null}
          </div>
          {notification.body ? <p className="mt-1 text-sm leading-5 text-muted">{notification.body}</p> : null}
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted">
            <span>{notification.task?.title ?? notification.actor?.full_name ?? 'Oasis Tasks'}</span>
            <span>{formatRelativeTime(notification.created_at)}</span>
          </div>
        </button>
      ))}
    </div>
  )
}
