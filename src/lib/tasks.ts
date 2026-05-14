import { supabase } from './supabase'
import {
  createNotification,
  createTaskAssignedNotification,
  createTaskCommentNotification,
  createTaskStatusNotification,
} from './notifications'
import type {
  Profile,
  Task,
  TaskCategory,
  TaskComment,
  TaskEvent,
  TaskPriority,
  TaskStatus,
} from '../types/database'

export interface TaskWithProfiles extends Task {
  created_by_profile: Pick<Profile, 'id' | 'full_name' | 'email' | 'role' | 'location'> | null
  assigned_to_profile: Pick<Profile, 'id' | 'full_name' | 'email' | 'role' | 'location'> | null
}

export interface TaskCommentWithProfile extends TaskComment {
  profile: Pick<Profile, 'id' | 'full_name' | 'role'> | null
}

export interface TaskEventWithProfile extends TaskEvent {
  profile: Pick<Profile, 'id' | 'full_name' | 'role'> | null
}

interface TaskCreateAccessDebug {
  auth_uid: string | null
  profile_id: string | null
  profile_email: string | null
  profile_role: string | null
  profile_is_approved: boolean | null
  can_create_task: boolean
}

export interface CreateTaskInput {
  title: string
  description?: string | null
  patient_reference?: string | null
  assigned_to?: string | null
  priority: TaskPriority
  category: TaskCategory
  due_date?: string | null
  location?: string | null
}

export type UpdateTaskInput = Partial<
  Pick<
    Task,
    | 'title'
    | 'description'
    | 'patient_reference'
    | 'assigned_to'
    | 'priority'
    | 'category'
    | 'status'
    | 'due_date'
    | 'location'
    | 'completed_at'
  >
>

const taskSelect = `
  *,
  created_by_profile:profiles!tasks_created_by_fkey(id, full_name, email, role, location),
  assigned_to_profile:profiles!tasks_assigned_to_fkey(id, full_name, email, role, location)
`

function sortTasks(tasks: TaskWithProfiles[]) {
  return [...tasks].sort((a, b) => {
    if (a.priority !== b.priority) {
      if (a.priority === 'urgent') return -1
      if (b.priority === 'urgent') return 1
    }

    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }

    if (a.due_date) return -1
    if (b.due_date) return 1

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

function normalizeText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getFriendlyTaskError(message: string) {
  if (message.toLowerCase().includes('row-level security')) {
    return 'Task could not be saved because your staff profile is not approved for task access yet. Ask an admin or manager to approve your profile, then sign out and back in.'
  }

  return message
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('You must be signed in to manage tasks.')
  }

  return user.id
}

async function assertCurrentUserCanCreateTasks(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, is_approved')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Unable to check your staff profile: ${error.message}`)
  }

  if (!data) {
    throw new Error('Your login does not have a staff profile yet. Sign out and back in, or ask an admin to check your profile row.')
  }

  if (!data.is_approved) {
    throw new Error(`Your staff profile (${data.email}) is not approved yet. Ask an admin or manager to approve your account.`)
  }

  const { data: debugAccess, error: debugError } = await supabase
    .rpc('debug_task_create_access')
    .maybeSingle()

  if (debugError) {
    console.warn('Unable to run task creation access debug check', debugError)
    return
  }

  const access = debugAccess as TaskCreateAccessDebug | null

  if (!access?.can_create_task) {
    throw new Error(
      `Supabase RLS still cannot create tasks for this session. auth.uid()=${access?.auth_uid ?? 'none'}, profile_id=${access?.profile_id ?? 'none'}, approved=${String(access?.profile_is_approved)}. Sign out and back in, then verify the app is using the same Supabase project you approved.`,
    )
  }

  if (access.auth_uid !== userId) {
    throw new Error('Your browser session changed while creating the task. Sign out and back in, then try again.')
  }
}

async function addTaskEvent(taskId: string, eventType: string, metadata: Record<string, unknown> = {}) {
  // Future hardening: generate audit events in database triggers or RPCs so
  // history cannot be skipped by a modified client.
  const userId = await getCurrentUserId()
  const { error } = await supabase.from('task_events').insert({
    task_id: taskId,
    user_id: userId,
    event_type: eventType,
    metadata,
  })

  if (error) {
    if (import.meta.env.DEV) console.warn('Task event was not recorded', error)
  }
}

async function addTaskEventSafe(taskId: string, eventType: string, metadata: Record<string, unknown> = {}) {
  try {
    await addTaskEvent(taskId, eventType, metadata)
  } catch (err) {
    if (import.meta.env.DEV) console.warn('Task event was not recorded', err)
  }
}

export async function getVisibleTasks() {
  const { data, error } = await supabase.from('tasks').select(taskSelect)

  if (error) {
    throw new Error(getFriendlyTaskError(error.message))
  }

  return sortTasks((data ?? []) as TaskWithProfiles[])
}

export async function getTaskById(taskId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(taskSelect)
    .eq('id', taskId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as TaskWithProfiles
}

export async function createTask(input: CreateTaskInput) {
  const userId = await getCurrentUserId()
  await assertCurrentUserCanCreateTasks(userId)
  const taskId = crypto.randomUUID()

  const { error } = await supabase
    .from('tasks')
    .insert({
      id: taskId,
      title: input.title.trim(),
      description: normalizeText(input.description),
      patient_reference: normalizeText(input.patient_reference),
      assigned_to: input.assigned_to || null,
      priority: input.priority,
      category: input.category,
      due_date: input.due_date || null,
      location: normalizeText(input.location),
      created_by: userId,
    })

  if (error) {
    throw new Error(getFriendlyTaskError(error.message))
  }

  const task = await getTaskById(taskId)
  await addTaskEventSafe(task.id, 'task_created')
  if (task.assigned_to && task.assigned_to !== userId) {
    void createTaskAssignedNotification(task.id, task.assigned_to)
  }
  return task
}

export async function updateTask(taskId: string, updates: UpdateTaskInput) {
  const previousTask = await getTaskById(taskId)
  const actorId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select(taskSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const task = data as TaskWithProfiles
  const eventTasks: Array<Promise<void>> = []
  const changedFields = Object.keys(updates).filter((field) => {
    const key = field as keyof UpdateTaskInput
    return updates[key] !== undefined && updates[key] !== previousTask[key as keyof Task]
  })

  if (changedFields.length > 0) {
    eventTasks.push(addTaskEventSafe(taskId, 'task_updated', { fields: changedFields }))
  }

  if (updates.assigned_to !== undefined && updates.assigned_to !== previousTask.assigned_to) {
    eventTasks.push(addTaskEventSafe(taskId, previousTask.assigned_to ? (updates.assigned_to ? 'task_reassigned' : 'task_unassigned') : 'task_assigned', {
      previous_assigned_to: previousTask.assigned_to,
      next_assigned_to: updates.assigned_to,
    }))
  }

  if (updates.status && updates.status !== previousTask.status) {
    eventTasks.push(addTaskEventSafe(taskId, updates.status === 'completed' ? 'task_completed' : updates.status === 'cancelled' ? 'task_cancelled' : 'status_changed', {
      previous_status: previousTask.status,
      next_status: updates.status,
    }))
  }

  if (updates.priority && updates.priority !== previousTask.priority) {
    eventTasks.push(addTaskEventSafe(taskId, 'priority_changed', {
      previous_priority: previousTask.priority,
      next_priority: updates.priority,
    }))
  }

  if (updates.due_date !== undefined && updates.due_date !== previousTask.due_date) {
    eventTasks.push(addTaskEventSafe(taskId, 'due_date_changed', {
      previous_due_date: previousTask.due_date,
      next_due_date: updates.due_date,
    }))
  }

  await Promise.all(eventTasks)

  if (
    updates.assigned_to !== undefined
    && updates.assigned_to
    && updates.assigned_to !== previousTask.assigned_to
    && updates.assigned_to !== actorId
  ) {
    void createNotification({
      user_id: updates.assigned_to,
      task_id: taskId,
      type: previousTask.assigned_to ? 'task_reassigned' : 'task_assigned',
      title: previousTask.assigned_to ? 'Task reassigned' : 'Task assigned',
      body: 'A task has been assigned to you.',
    })
  }

  if (updates.status && updates.status !== previousTask.status) {
    const recipients = new Set<string>()
    if (previousTask.created_by !== actorId) recipients.add(previousTask.created_by)
    if (previousTask.assigned_to && previousTask.assigned_to !== actorId) recipients.add(previousTask.assigned_to)

    recipients.forEach((recipientId) => {
      void createTaskStatusNotification(taskId, recipientId, updates.status as TaskStatus)
    })
  }

  return task
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const updates: UpdateTaskInput = {
    status,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
  }

  const task = await updateTask(taskId, updates)
  return task
}

export async function completeTask(taskId: string) {
  const task = await updateTask(taskId, {
    status: 'completed',
    completed_at: new Date().toISOString(),
  })
  return task
}

export async function deleteTask(taskId: string) {
  await addTaskEventSafe(taskId, 'task_deleted')
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)

  if (error) {
    throw new Error('Only managers and admins can delete tasks.')
  }
}

export async function getTaskComments(taskId: string) {
  const { data, error } = await supabase
    .from('task_comments')
    .select('*, profile:profiles!task_comments_user_id_fkey(id, full_name, role)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as TaskCommentWithProfile[]
}

export async function getTaskEvents(taskId: string) {
  const { data, error } = await supabase
    .from('task_events')
    .select('*, profile:profiles!task_events_user_id_fkey(id, full_name, role)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as TaskEventWithProfile[]
}

export async function addTaskComment(taskId: string, body: string) {
  const userId = await getCurrentUserId()
  const task = await getTaskById(taskId)
  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      user_id: userId,
      body: body.trim(),
    })
    .select('*, profile:profiles!task_comments_user_id_fkey(id, full_name, role)')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await addTaskEventSafe(taskId, 'comment_added')
  const recipients = new Set<string>()
  if (task.created_by !== userId) recipients.add(task.created_by)
  if (task.assigned_to && task.assigned_to !== userId) recipients.add(task.assigned_to)
  recipients.forEach((recipientId) => {
    void createTaskCommentNotification(taskId, recipientId)
  })
  return data as TaskCommentWithProfile
}

export async function getAssignableProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, location, is_approved, created_at, updated_at')
    .eq('is_approved', true)
    .order('full_name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Profile[]
}
