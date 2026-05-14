import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  Folder,
  Link as LinkIcon,
  MoreHorizontal,
  PlayCircle,
  Printer,
  RotateCcw,
  Send,
  Trash2,
  UserRound,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../auth/useAuth'
import { TaskCategoryPicker } from './TaskCategoryPicker'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { DateTimePicker } from '../ui/DateTimePicker'
import { DropdownMenu } from '../ui/DropdownMenu'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Skeleton } from '../ui/Skeleton'
import { Textarea } from '../ui/Textarea'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useTaskCategories } from '../../hooks/useTaskCategories'
import { useWorkspacePermissions } from '../../hooks/useWorkspacePermissions'
import { formatTaskEvent } from '../../lib/activity'
import { cn } from '../../lib/cn'
import { formatDueDate, formatRelativeTime, isOverdue } from '../../lib/dates'
import { canCancelTask, canCommentOnTask, canDeleteTask, canEditTaskDetails, canReassignTask, canUpdateTaskStatus } from '../../lib/permissions'
import { supabase } from '../../lib/supabase'
import {
  formatDateTime,
  priorityLabels,
  statusLabels,
  taskPriorities,
  taskStatuses,
} from '../../lib/taskLabels'
import { getTaskCategoryName } from '../../lib/workspaceSettings'
import {
  addTaskComment,
  getTaskComments,
  getTaskEvents,
  type TaskCommentWithProfile,
  type TaskEventWithProfile,
  type TaskWithProfiles,
  type UpdateTaskInput,
} from '../../lib/tasks'
import type { Profile, TaskCategory, TaskPriority, TaskStatus } from '../../types/database'

interface TaskDetailPanelProps {
  task: TaskWithProfiles
  profiles: Profile[]
  onClose: () => void
  onUpdate: (taskId: string, updates: UpdateTaskInput) => Promise<TaskWithProfiles>
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<TaskWithProfiles>
  onComplete: (taskId: string) => Promise<TaskWithProfiles>
  onDelete: (taskId: string) => Promise<void>
  defaultEditing?: boolean
}

function renderStatusIcon(status: TaskStatus, className = 'h-5 w-5') {
  if (status === 'completed') return <CheckCircle2 className={className} />
  if (status === 'cancelled') return <XCircle className={className} />
  if (status === 'in_progress') return <PlayCircle className={className} />
  if (status === 'waiting') return <Clock className={className} />
  return <Circle className={className} />
}

function statusColor(status: TaskStatus) {
  if (status === 'completed') return 'text-success'
  if (status === 'cancelled') return 'text-muted'
  if (status === 'waiting') return 'text-warning'
  if (status === 'in_progress') return 'text-accentDark'
  return 'text-muted'
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-2 text-sm">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span>{label}</span>
      </div>
      <div className="min-w-0 font-medium text-text">{value}</div>
    </div>
  )
}

export function TaskDetailPanel({
  task,
  profiles,
  onClose,
  onUpdate,
  onStatusChange,
  onComplete,
  onDelete,
  defaultEditing = false,
}: TaskDetailPanelProps) {
  const { profile } = useAuth()
  const { data: categories } = useTaskCategories()
  const { values: workspacePermissions } = useWorkspacePermissions()
  const modalRef = useRef<HTMLElement | null>(null)
  const channelIdRef = useRef(crypto.randomUUID())
  const canEditDetails = canEditTaskDetails(profile, task, workspacePermissions)
  const canUpdateStatus = canUpdateTaskStatus(profile, task)
  const canComment = canCommentOnTask(profile, task)
  const canDelete = canDeleteTask(profile, task, workspacePermissions)
  const canReassign = canReassignTask(profile, task, workspacePermissions)
  const canCancel = canCancelTask(profile, task, workspacePermissions)
  const isOnline = useOnlineStatus()
  const [isEditing, setIsEditing] = useState(defaultEditing && canEditDetails)
  const [showHistory, setShowHistory] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [patientReference, setPatientReference] = useState(task.patient_reference ?? '')
  const [assignedTo, setAssignedTo] = useState(task.assigned_to ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [category, setCategory] = useState<TaskCategory>(task.category)
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.slice(0, 16) : '')
  const [comments, setComments] = useState<TaskCommentWithProfile[]>([])
  const [events, setEvents] = useState<TaskEventWithProfile[]>([])
  const [commentBody, setCommentBody] = useState('')
  const [loadingComments, setLoadingComments] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [error, setError] = useState('')

  const isClosed = task.status === 'completed' || task.status === 'cancelled'
  const hasUnsavedChanges =
    title !== task.title
    || description !== (task.description ?? '')
    || patientReference !== (task.patient_reference ?? '')
    || assignedTo !== (task.assigned_to ?? '')
    || priority !== task.priority
    || status !== task.status
    || category !== task.category
    || dueDate !== (task.due_date ? task.due_date.slice(0, 16) : '')
  const isInEditMode = isEditing && canEditDetails

  function requestClose() {
    if (isInEditMode && hasUnsavedChanges) {
      const shouldClose = window.confirm('Discard unsaved changes?')
      if (!shouldClose) return
    }
    onClose()
  }

  useClickOutside(modalRef, requestClose, !confirmDeleteOpen)

  function resetDraft() {
    setTitle(task.title)
    setDescription(task.description ?? '')
    setPatientReference(task.patient_reference ?? '')
    setAssignedTo(task.assigned_to ?? '')
    setPriority(task.priority)
    setStatus(task.status)
    setCategory(task.category)
    setDueDate(task.due_date ? task.due_date.slice(0, 16) : '')
  }

  useEffect(() => {
    if (isInEditMode) return
    const timeoutId = window.setTimeout(() => resetDraft(), 0)
    return () => window.clearTimeout(timeoutId)
    // resetDraft intentionally reads the latest task fields and only runs when
    // the task object changes while the panel is in view mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, isInEditMode])

  useEffect(() => {
    async function loadComments() {
      setLoadingComments(true)
      try {
        setComments(await getTaskComments(task.id))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load updates.')
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

    const commentsChannel = supabase
      .channel(`task-comments-${task.id}-${channelIdRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments', filter: `task_id=eq.${task.id}` }, () => void loadComments())
      .subscribe()
    const eventsChannel = supabase
      .channel(`task-events-${task.id}-${channelIdRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_events', filter: `task_id=eq.${task.id}` }, () => void loadEvents())
      .subscribe()

    return () => {
      void supabase.removeChannel(commentsChannel)
      void supabase.removeChannel(eventsChannel)
    }
  }, [task.id])

  async function saveChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!canEditDetails) {
      setError('Only the creator or a manager can edit task details.')
      return
    }

    if (title.trim().length < 3) {
      setError('Add a short task title.')
      return
    }

    if (patientReference.trim().length > 24) {
      setError('Keep reference/context under 24 characters.')
      return
    }

    setSaving(true)
    try {
      await onUpdate(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        patient_reference: patientReference.trim() || null,
        assigned_to: assignedTo || null,
        priority,
        category,
        status,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      })
      toast.success('Task updated')
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task.')
      toast.error('Task update failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(nextStatus: TaskStatus) {
    setError('')
    if (!canUpdateStatus) {
      setError('You do not have permission to update this task status.')
      return
    }
    try {
      if (nextStatus === 'completed') {
        await onComplete(task.id)
      } else {
        await onStatusChange(task.id, nextStatus)
      }
      toast.success(nextStatus === 'completed' ? 'Task completed' : 'Task updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task.')
      toast.error('Task update failed')
    }
  }

  async function handleAddComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!commentBody.trim()) return
    if (!canComment) {
      setError('You do not have permission to add updates to this task.')
      return
    }

    try {
      const comment = await addTaskComment(task.id, commentBody)
      setComments((current) => [...current, comment])
      setCommentBody('')
      toast.success('Update posted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post update.')
      toast.error('Update failed')
    }
  }

  async function copyTaskLink() {
    const url = `${window.location.origin}/tasks/${task.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Task link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  const moreItems = [
    { label: 'Print', icon: <Printer className="h-4 w-4" />, onSelect: () => window.print() },
    { label: 'Copy link', icon: <LinkIcon className="h-4 w-4" />, onSelect: () => void copyTaskLink() },
    ...(canCancel && !isClosed ? [{ label: 'Cancel task', icon: <XCircle className="h-4 w-4" />, onSelect: () => void handleStatusChange('cancelled') }] : []),
    ...(canUpdateStatus && isClosed ? [{ label: 'Reopen task', icon: <RotateCcw className="h-4 w-4" />, onSelect: () => void handleStatusChange('new') }] : []),
    ...(canDelete ? [{
      label: 'Delete task',
      icon: <Trash2 className="h-4 w-4" />,
      tone: 'danger' as const,
      disabled: !isOnline,
      onSelect: () => setConfirmDeleteOpen(true),
    }] : []),
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text/25 px-3 py-4 backdrop-blur-[2px] md:px-6" role="dialog" aria-modal="true" aria-label="Task detail">
      <aside ref={modalRef} className="task-print-detail flex h-[96vh] w-full max-w-[680px] animate-[modalIn_.16s_ease-out] flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl shadow-text/20 md:h-[85vh]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border/70 bg-surface/95 px-5 py-4 backdrop-blur print:static print:border-0">
          <div className="flex min-w-0 items-start gap-3">
            <span className={cn('mt-1 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-background', statusColor(task.status))}>
              {renderStatusIcon(task.status)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-muted">{statusLabels[task.status]}</span>
                {task.priority === 'urgent' ? <span className="inline-flex items-center gap-1 rounded-full bg-urgent/10 px-2.5 py-1 text-xs font-medium text-urgent"><Flag className="h-3 w-3" /> Urgent</span> : null}
              </div>
              <h2 className="mt-2 break-words font-heading text-3xl font-semibold leading-tight text-text">{task.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {task.assigned_to_profile?.full_name ?? 'Unassigned'} - {formatDueDate(task.due_date)} - {getTaskCategoryName(categories, task.category)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 print:hidden">
            {!isInEditMode && canUpdateStatus && task.status !== 'completed' ? (
              <Button type="button" className="hidden h-10 px-3 sm:inline-flex" onClick={() => void handleStatusChange('completed')}>
                Complete
              </Button>
            ) : null}
            {!isInEditMode && canEditDetails ? <Button type="button" variant="secondary" className="h-10 px-3" onClick={() => setIsEditing(true)}>Edit</Button> : null}
            {!isInEditMode ? <DropdownMenu label={<MoreHorizontal className="h-5 w-5" />} items={moreItems} /> : null}
            <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-muted hover:bg-background hover:text-text" onClick={requestClose} aria-label="Close task">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 lg:px-6">
          {error ? <p className="rounded-2xl border border-urgent/30 bg-urgent/5 px-4 py-3 text-sm text-urgent">{error}</p> : null}

          {isInEditMode ? (
            <form className="space-y-4" onSubmit={saveChanges}>
              <label className="block text-sm font-semibold text-text">
                Title
                <Input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2" />
              </label>
              <label className="block text-sm font-semibold text-text">
                Details
                <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Details, optional" className="mt-2" />
              </label>
              <div>
                <label className="block text-sm font-semibold text-text">
                  Reference / context
                  <Input value={patientReference} maxLength={24} onChange={(event) => setPatientReference(event.target.value)} placeholder="Reference / context" className="mt-2" />
                </label>
                <p className="mt-2 text-xs text-muted">Use initials or a short reference only. Do not add private medical details.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Select value={assignedTo} disabled={!canReassign} onChange={(event) => setAssignedTo(event.target.value)}>
                  <option value="">Unassigned</option>
                  {profiles.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}
                </Select>
                <Select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
                  {taskStatuses.filter((item) => item !== 'cancelled' || canCancel).map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
                </Select>
                <Select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
                  {taskPriorities.map((item) => <option key={item} value={item}>{priorityLabels[item]} priority</option>)}
                </Select>
                <TaskCategoryPicker value={category} onChange={(value) => setCategory(value as TaskCategory)} />
                <DateTimePicker value={dueDate || null} onChange={(value) => setDueDate(value ?? '')} />
              </div>
              <div className="flex flex-wrap gap-3 pt-2 print:hidden">
                <Button type="submit" disabled={saving}>{saving ? 'Saving' : 'Save'}</Button>
                <Button type="button" variant="secondary" disabled={saving} onClick={() => {
                  resetDraft()
                  setIsEditing(false)
                }}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <>
              {!canEditDetails ? (
                <p className="rounded-2xl bg-background px-4 py-3 text-sm text-muted">Only the creator or a manager can edit task details.</p>
              ) : null}
              <div className="flex flex-wrap gap-2 print:hidden">
                {canUpdateStatus && (task.status === 'new' || task.status === 'waiting') ? (
                  <Button type="button" variant="secondary" className="h-9 gap-2 px-3" onClick={() => void handleStatusChange('in_progress')}>
                    <PlayCircle className="h-4 w-4" /> Start
                  </Button>
                ) : null}
                {canUpdateStatus && (task.status === 'new' || task.status === 'in_progress') ? (
                  <Button type="button" variant="secondary" className="h-9 gap-2 px-3" onClick={() => void handleStatusChange('waiting')}>
                    <Clock className="h-4 w-4" /> Wait
                  </Button>
                ) : null}
                {canUpdateStatus && !isClosed ? (
                  <Button type="button" variant="secondary" className="h-9 gap-2 px-3" onClick={() => void handleStatusChange('completed')}>
                    <CheckCircle2 className="h-4 w-4" /> Complete
                  </Button>
                ) : null}
                {canUpdateStatus && isClosed ? (
                  <Button type="button" variant="secondary" className="h-9 gap-2 px-3" onClick={() => void handleStatusChange('new')}>
                    <RotateCcw className="h-4 w-4" /> Reopen
                  </Button>
                ) : null}
              </div>

              {(task.description || task.patient_reference) ? (
                <section className="space-y-4">
                  {task.description ? <p className="whitespace-pre-wrap text-sm leading-7 text-text">{task.description}</p> : null}
                  {task.patient_reference ? (
                    <p className="inline-flex rounded-2xl bg-background px-3 py-2 text-sm font-medium text-accentDark">Ref: {task.patient_reference}</p>
                  ) : null}
                </section>
              ) : null}

              <section className="rounded-2xl border border-border/80 bg-background/50 p-4">
                <DetailRow icon={<Avatar name={task.assigned_to_profile?.full_name} id={task.assigned_to ?? undefined} className="h-6 w-6 rounded-xl text-[10px]" />} label="Assigned" value={task.assigned_to_profile?.full_name ?? 'Unassigned'} />
                <DetailRow icon={<Avatar name={task.created_by_profile?.full_name} id={task.created_by} className="h-6 w-6 rounded-xl text-[10px]" />} label="Created by" value={task.created_by_profile?.full_name ?? 'Unknown'} />
                <DetailRow icon={<Calendar className="h-4 w-4" />} label="Due" value={<span className={isOverdue(task.due_date) && !isClosed ? 'text-urgent' : ''}>{task.due_date ? `${formatDueDate(task.due_date)} (${formatDateTime(task.due_date)})` : 'No date'}</span>} />
                <DetailRow icon={<Folder className="h-4 w-4" />} label="Category" value={getTaskCategoryName(categories, task.category)} />
                <DetailRow icon={<UserRound className="h-4 w-4" />} label="Created" value={formatDateTime(task.created_at)} />
              </section>
            </>
          )}

          <section>
            <h3 className="font-heading text-2xl font-semibold text-text">Updates</h3>
            <div className="mt-4 space-y-3">
              {loadingComments ? <p className="text-sm text-muted">Loading updates...</p> : null}
              {!loadingComments && comments.length === 0 ? <p className="text-sm text-muted">No updates yet.</p> : null}
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar name={comment.profile?.full_name} id={comment.user_id} />
                  <div className="min-w-0 flex-1 rounded-2xl bg-background px-4 py-3">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="font-semibold text-text">{comment.profile?.full_name ?? 'Staff member'}</span>
                      <span>{formatRelativeTime(comment.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-text">{comment.body}</p>
                  </div>
                </div>
              ))}
            </div>
            {canComment ? <form className="mt-4 flex gap-2 print:hidden" onSubmit={handleAddComment}>
              <Input value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder="Add a quick update..." />
              <Button type="submit" className="h-11 gap-2 px-3">
                <Send className="h-4 w-4" /> <span className="hidden sm:inline">Post</span>
              </Button>
            </form> : null}
          </section>

          <section className="print:block">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-2xl border border-border px-4 py-3 text-left text-sm font-semibold text-text transition hover:bg-background print:hidden"
              onClick={() => setShowHistory((value) => !value)}
            >
              <span>History</span>
              <span className="text-muted">{showHistory ? 'Hide' : 'Show history'}</span>
            </button>
            <div className={cn('mt-4 space-y-3 print:block', showHistory ? 'block' : 'hidden')}>
              {loadingEvents ? (
                <>
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </>
              ) : null}
              {!loadingEvents && events.length === 0 ? <p className="text-sm text-muted">No history yet.</p> : null}
              {events.map((event) => {
                const formatted = formatTaskEvent(event)
                return (
                  <div key={event.id} className="relative border-l-2 border-border pl-4">
                    <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-surface bg-accent" />
                    <div className="rounded-2xl bg-background px-4 py-3">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="font-semibold text-text">{formatted.message}</span>
                        <span className="text-xs text-muted" title={formatted.timestamp}>{formatted.time}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted">{formatted.actor}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <ConfirmDialog
          isOpen={confirmDeleteOpen}
          title="Delete task"
          message="This permanently removes the task. Completed tasks should usually stay available for accountability."
          confirmLabel="Delete task"
          loading={deleting}
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={async () => {
            setDeleting(true)
            try {
              await onDelete(task.id)
              toast.success('Task deleted')
              onClose()
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to delete task.')
              toast.error('Delete failed')
            } finally {
              setDeleting(false)
              setConfirmDeleteOpen(false)
            }
          }}
        />
      </aside>
    </div>
  )
}
