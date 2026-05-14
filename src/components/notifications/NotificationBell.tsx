import { useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { toast } from 'sonner'
import { useNotifications } from '../../hooks/useNotifications'
import { useClickOutside } from '../../hooks/useClickOutside'
import type { NotificationWithRelations } from '../../lib/notifications'
import { Button } from '../ui/Button'
import { useTaskModal } from '../tasks/useTaskModal'
import { NotificationList } from './NotificationList'

export function NotificationBell() {
  const { openTask } = useTaskModal()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markNotificationRead,
    markAllNotificationsRead,
  } = useNotifications()
  useClickOutside(panelRef, () => setOpen(false), open)

  async function handleNotificationClick(notification: NotificationWithRelations) {
    await markNotificationRead(notification.id)
    toast.success('Notification marked read')
    setOpen(false)

    if (notification.task_id) {
      openTask(notification.task_id)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface text-text transition hover:border-accent"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-x-4 top-20 z-50 rounded-2xl border border-border bg-surface shadow-xl shadow-text/10 md:absolute md:inset-auto md:right-0 md:top-14 md:w-96">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="font-heading text-2xl font-semibold text-text">Notifications</p>
              <p className="text-xs text-muted">{unreadCount} unread</p>
            </div>
            <Button type="button" variant="ghost" onClick={() => void markAllNotificationsRead().then(() => toast.success('Notifications marked read'))}>
              Mark all read
            </Button>
          </div>
          <NotificationList
            notifications={notifications}
            loading={loading}
            error={error}
            onNotificationClick={(notification) => void handleNotificationClick(notification)}
          />
        </div>
      ) : null}
    </div>
  )
}
