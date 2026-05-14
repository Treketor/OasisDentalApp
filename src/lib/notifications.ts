import { supabase } from './supabase'
import type { Notification, NotificationType, TaskStatus } from '../types/database'

export interface NotificationWithRelations extends Notification {
  task: { id: string; title: string } | null
  actor: { id: string; full_name: string; role: string } | null
}

export interface CreateNotificationInput {
  user_id: string
  task_id?: string | null
  actor_id?: string | null
  type: NotificationType
  title: string
  body?: string | null
}

const notificationSelect = `
  *,
  task:tasks(id, title),
  actor:profiles!notifications_actor_id_fkey(id, full_name, role)
`

function isMissingNotificationsTable(message: string) {
  return message.includes('notifications') && (message.includes('does not exist') || message.includes('schema cache'))
}

function mapNotificationError(error: { message: string }) {
  if (isMissingNotificationsTable(error.message)) {
    return 'Notifications are not set up yet. Run supabase/notifications-migration.sql.'
  }

  return error.message
}

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function getNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select(notificationSelect)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    throw new Error(mapNotificationError(error))
  }

  return (data ?? []) as NotificationWithRelations[]
}

export async function getUnreadNotificationCount() {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)

  if (error) {
    throw new Error(mapNotificationError(error))
  }

  return count ?? 0
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) throw new Error(mapNotificationError(error))
}

export async function markAllNotificationsRead() {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('You must be signed in to update notifications.')

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) throw new Error(mapNotificationError(error))
}

export async function createNotification(input: CreateNotificationInput) {
  // Future hardening: move notification fan-out into a server-side function so
  // recipients are derived in the database and cannot be influenced by clients.
  const actorId = input.actor_id ?? (await getCurrentUserId())
  if (!actorId || input.user_id === actorId) return null

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: input.user_id,
      task_id: input.task_id ?? null,
      actor_id: actorId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
    })

  if (error) {
    console.warn('Notification was not created', error)
    return null
  }

  return null
}

export async function createTaskAssignedNotification(taskId: string, assigneeId: string) {
  return createNotification({
    user_id: assigneeId,
    task_id: taskId,
    type: 'task_assigned',
    title: 'Task assigned',
    body: 'A task has been assigned to you.',
  })
}

export async function createTaskCommentNotification(taskId: string, recipientId: string) {
  return createNotification({
    user_id: recipientId,
    task_id: taskId,
    type: 'task_commented',
    title: 'New task comment',
    body: 'A comment was added to a task you are involved in.',
  })
}

export async function createTaskStatusNotification(taskId: string, recipientId: string, status: TaskStatus) {
  return createNotification({
    user_id: recipientId,
    task_id: taskId,
    type: status === 'completed' ? 'task_completed' : 'task_status_changed',
    title: status === 'completed' ? 'Task completed' : 'Task status changed',
    body: `Status changed to ${status.replace('_', ' ')}.`,
  })
}

export async function createTaskOverdueNotification(taskId: string, recipientId: string) {
  const actorId = await getCurrentUserId()
  if (!actorId) return null

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: recipientId,
      task_id: taskId,
      actor_id: actorId,
      type: 'task_overdue',
      title: 'Task overdue',
      body: 'This task is overdue and needs attention.',
    })

  if (error) {
    console.warn('Overdue notification was not created', error)
  }

  return null
}

export async function createApprovalGrantedNotification(userId: string) {
  return createNotification({
    user_id: userId,
    type: 'approval_granted',
    title: 'Access approved',
    body: 'Your Oasis Tasks account has been approved.',
  })
}
