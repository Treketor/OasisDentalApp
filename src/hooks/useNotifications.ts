import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../components/auth/useAuth'
import {
  getNotifications,
  markAllNotificationsRead as markAllNotificationsReadService,
  markNotificationRead as markNotificationReadService,
  type NotificationWithRelations,
} from '../lib/notifications'
import { supabase } from '../lib/supabase'

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      setNotifications(await getNotifications())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshNotifications()
    }, 0)

    if (!user) {
      return () => window.clearTimeout(timeoutId)
    }

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => void refreshNotifications(),
      )
      .subscribe()

    return () => {
      window.clearTimeout(timeoutId)
      void supabase.removeChannel(channel)
    }
  }, [refreshNotifications, user])

  const markNotificationRead = useCallback(
    async (notificationId: string) => {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId ? { ...notification, is_read: true } : notification,
        ),
      )

      try {
        await markNotificationReadService(notificationId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update notification.')
      }
    },
    [],
  )

  const markAllNotificationsRead = useCallback(async () => {
    const previous = notifications
    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })))

    try {
      await markAllNotificationsReadService()
    } catch (err) {
      setNotifications(previous)
      setError(err instanceof Error ? err.message : 'Failed to update notifications.')
    }
  }, [notifications])

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  )

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  }
}
