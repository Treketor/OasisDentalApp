import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { canDeleteTasks } from '../../lib/permissions'
import {
  addTaskComment,
  getTaskComments,
  getTaskEvents,
  type TaskCommentWithProfile,
  type TaskEventWithProfile,
  type TaskWithProfiles,
  type UpdateTaskInput,
} from '../../lib/tasks'
import {
  categoryLabels,
  formatDateTime,
  priorityLabels,
  statusLabels,
  taskCategories,
  taskPriorities,
  taskStatuses,
} from '../../lib/taskLabels'
import { formatDueDate, isOverdue } from '../../lib/dates'
import type { Profile, TaskCategory, TaskPriority, TaskStatus } from '../../types/database'
import { useAuth } from '../auth/useAuth'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { PriorityPill } from '../ui/PriorityPill'
import { Select } from '../ui/Select'
import { StatusPill } from '../ui/StatusPill'
import { Textarea } from '../ui/Textarea'
import { Skeleton } from '../ui/Skeleton'

interface TaskDetailPanelProps {
  task: TaskWithProfiles
  profiles: Profile[]
  onClose: () => void
  onUpdate: (taskId: string, updates: UpdateTaskInput) => Promise<TaskWithProfiles>
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<TaskWithProfiles>
  onComplete: (taskId: string) => Promise<TaskWithProfiles>
  onDelete: (taskId: string) => Promise<void>
}

export function TaskDetailPanel({
  task,
  profiles,
  onClose,
  onUpdate,
  onStatusChange,
  onComplete,
  onDelete,
}: TaskDetailPanelProps) {
  const { profile } = useAuth()
  const canDelete = canDeleteTasks(profile)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [patientReference, setPatientReference] = useState(task.patient_reference ?? '')
  const [assignedTo, setAssignedTo] = useState(task.assigned_to ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [category, setCategory] = useState<TaskCategory>(task.category)
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.slice(0, 16) : '')
  const [location, setLocation] = useState(task.location ?? '')
  const [comments, setComments] = useState<TaskCommentWithProfile[]>([])
  const [events, setEvents] = useState<TaskEventWithProfile[]>([])
  const [commentBody, setCommentBody] = useState('')
  const [loadingComments, setLoadingComments] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadComments() {
      setLoadingComments(true)
      try {
        setComments(await getTaskComments(task.id))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load comments.')
      } finally {
        setLoadingComments(false)
      }
    }
    async function loadEvents() {
      setLoadingEvents(true)
      try {
        setEvents(await getTaskEvents(task.id))
      } catch {
        setEvents([])
      } finally {
        setLoadingEvents(false)
      }
    }

    void loadComments()
    void loadEvents()

    const channel = supabase
      .channel(`task-comments-${task.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_comments', filter: `task_id=eq.${task.id}` },
        () => void loadComments(),
      )
      .subscribe()
    const eventsChannel = supabase
      .channel(`task-events-${task.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_events', filter: `task_id=eq.${task.id}` },
        () => void loadEvents(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
      void supabase.removeChannel(eventsChannel)
    }
  }, [task.id])

  async function saveChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await onUpdate(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        patient_reference: patientReference.trim() || null,
        assigned_to: assignedTo || null,
        priority,
        category,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        location: location.trim() || null,
      })
      toast.success('Task updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task.')
      toast.error('Task update failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(nextStatus: TaskStatus) {
    setStatus(nextStatus)
    try {
      await onStatusChange(task.id, nextStatus)
      toast.success('Status updated')
    } catch (err) {
      setStatus(task.status)
      setError(err instanceof Error ? err.message : 'Failed to update status.')
      toast.error('Status update failed')
    }
  }

  async function handleAddComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!commentBody.trim()) return

    try {
      const comment = await addTaskComment(task.id, commentBody)
      setComments((current) => [...current, comment])
      setCommentBody('')
      toast.success('Comment added')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment.')
      toast.error('Comment failed')
    }
  }

  function describeEvent(event: TaskEventWithProfile) {
    const labels: Record<string, string> = {
      task_created: 'Task created',
      task_updated: 'Task updated',
      status_changed: 'Status changed',
      task_completed: 'Task completed',
      task_deleted: 'Task deleted',
      comment_added: 'Comment added',
    }
    return labels[event.event_type] ?? event.event_type.replaceAll('_', ' ')
  }

  return (
    <div className="fixed inset-0 z-50 bg-text/30 lg:flex lg:justify-end" role="dialog" aria-modal="true" aria-label="Task detail">
      <aside className="ml-auto flex h-full w-full flex-col overflow-y-auto border-l border-border bg-surface p-5 shadow-xl lg:max-w-2xl lg:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <PriorityPill priority={task.priority} />
              <StatusPill status={task.status} />
            </div>
            <h2 className="font-heading text-4xl font-bold uppercase text-text">{task.title}</h2>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        {error ? <p className="mb-4 rounded-lg border border-urgent/30 bg-urgent/5 px-4 py-3 text-sm text-urgent">{error}</p> : null}

        <form className="space-y-4" onSubmit={saveChanges}>
          <label className="block text-sm font-semibold text-text">
            Title
            <Input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2" />
          </label>
          <label className="block text-sm font-semibold text-text">
            Description
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" className="mt-2" />
          </label>
          <div>
            <label className="block text-sm font-semibold text-text">
              Patient reference
              <Input value={patientReference} maxLength={24} onChange={(event) => setPatientReference(event.target.value)} placeholder="Patient reference" className="mt-2" />
            </label>
            <p className="mt-2 text-xs text-muted">Use initials or an internal reference only.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Select value={status} onChange={(event) => void handleStatusChange(event.target.value as TaskStatus)}>
              {taskStatuses.map((item) => (
                <option key={item} value={item}>{statusLabels[item]}</option>
              ))}
            </Select>
            <Select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>
              <option value="">Unassigned</option>
              {profiles.map((item) => (
                <option key={item.id} value={item.id}>{item.full_name}</option>
              ))}
            </Select>
            <Select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
              {taskPriorities.map((item) => (
                <option key={item} value={item}>{priorityLabels[item]}</option>
              ))}
            </Select>
            <Select value={category} onChange={(event) => setCategory(event.target.value as TaskCategory)}>
              {taskCategories.map((item) => (
                <option key={item} value={item}>{categoryLabels[item]}</option>
              ))}
            </Select>
            <Input value={dueDate} onChange={(event) => setDueDate(event.target.value)} type="datetime-local" />
            <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location" />
          </div>

          <div className="grid gap-2 rounded-lg border border-border bg-background p-4 text-sm text-muted md:grid-cols-2">
            <p>Created by: {task.created_by_profile?.full_name ?? 'Unknown'}</p>
            <p>Assigned to: {task.assigned_to_profile?.full_name ?? 'Unassigned'}</p>
            <p>Created: {formatDateTime(task.created_at)}</p>
            <p className={isOverdue(task.due_date) && task.status !== 'completed' ? 'font-semibold text-urgent' : ''}>
              Due: {task.due_date ? `${formatDueDate(task.due_date)} (${formatDateTime(task.due_date)})` : 'Not set'}
            </p>
            <p>Completed: {formatDateTime(task.completed_at)}</p>
            <p>Location: {task.location || 'Not set'}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>{saving ? 'Saving' : 'Save changes'}</Button>
            <Button type="button" variant="secondary" onClick={() => void onComplete(task.id).then(() => toast.success('Task completed')).catch(() => toast.error('Complete failed'))}>Mark complete</Button>
            {canDelete ? (
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  try {
                    await onDelete(task.id)
                    toast.success('Task deleted')
                    onClose()
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to delete task.')
                    toast.error('Delete failed')
                  }
                }}
              >
                Delete
              </Button>
            ) : null}
          </div>
        </form>

        <section className="mt-8 border-t border-border pt-6">
          <h3 className="font-heading text-3xl font-semibold uppercase text-text">Comments</h3>
          <div className="mt-4 space-y-3">
            {loadingComments ? <p className="text-sm text-muted">Loading comments...</p> : null}
            {!loadingComments && comments.length === 0 ? <p className="text-sm text-muted">No comments yet.</p> : null}
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-border bg-background p-4">
                <div className="mb-2 flex justify-between gap-3 text-xs text-muted">
                  <span>{comment.profile?.full_name ?? 'Staff member'}</span>
                  <span>{formatDateTime(comment.created_at)}</span>
                </div>
                <p className="text-sm leading-6 text-text">{comment.body}</p>
              </div>
            ))}
          </div>
          <form className="mt-4 flex flex-col gap-3" onSubmit={handleAddComment}>
            <Textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder="Add a handover comment" className="min-h-24" />
            <Button type="submit" className="self-start">Add comment</Button>
          </form>
        </section>
        <section className="mt-8 border-t border-border pt-6">
          <h3 className="font-heading text-3xl font-semibold uppercase text-text">Activity</h3>
          <div className="mt-4 space-y-3">
            {loadingEvents ? (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            ) : null}
            {!loadingEvents && events.length === 0 ? <p className="text-sm text-muted">No activity yet.</p> : null}
            {events.map((event) => (
              <div key={event.id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-semibold text-text">{describeEvent(event)}</span>
                  <span className="text-xs text-muted">{formatDateTime(event.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{event.profile?.full_name ?? 'System'}</p>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  )
}
