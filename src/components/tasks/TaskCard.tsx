import { useState, type MouseEvent } from 'react'
import { Calendar, CheckCircle2, Circle, Clock, Flag, PlayCircle, RotateCcw, Tag, UserRound, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../auth/useAuth'
import { Avatar } from '../ui/Avatar'
import { cn } from '../../lib/cn'
import { formatDueDate, isDueToday, isOverdue } from '../../lib/dates'
import { canSeeTaskQuickActions } from '../../lib/permissions'
import { getTaskCategoryName, fallbackTaskCategories } from '../../lib/workspaceSettings'
import type { TaskWithProfiles } from '../../lib/tasks'
import type { TaskCategorySetting } from '../../types/database'
import type { TaskStatus } from '../../types/database'

function renderStatusIcon(status: TaskStatus) {
  if (status === 'completed') return <CheckCircle2 className="h-5 w-5 text-success" />
  if (status === 'cancelled') return <XCircle className="h-5 w-5 text-muted" />
  if (status === 'in_progress') return <PlayCircle className="h-5 w-5 text-accentDark" />
  if (status === 'waiting') return <Clock className="h-5 w-5 text-warning" />
  return <Circle className="h-5 w-5 text-muted" />
}

function statusLabel(status: TaskStatus) {
  if (status === 'in_progress') return 'In progress'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function statusTone(status: TaskStatus) {
  if (status === 'completed') return 'border-success/30 bg-success/10 text-success'
  if (status === 'cancelled') return 'border-border bg-background text-muted'
  if (status === 'in_progress') return 'border-accent/30 bg-accent/10 text-accentDark'
  if (status === 'waiting') return 'border-warning/30 bg-warning/10 text-warning'
  return 'border-border bg-background text-muted'
}

function compactDueLabel(value: string | null) {
  if (!value) return 'No date'
  const date = new Date(value)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0
  const day = date.toDateString() === today.toDateString()
    ? 'Today'
    : date.toDateString() === tomorrow.toDateString()
      ? 'Tomorrow'
      : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(date)

  if (!hasTime) return day
  return `${day}, ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)}`
}

function ActionButton({
  icon,
  label,
  tone,
  disabled,
  muted = false,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  tone: 'accent' | 'warning' | 'success' | 'muted'
  disabled: boolean
  muted?: boolean
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  const toneClass = {
    accent: 'border-accent/25 bg-accent/10 text-accentDark hover:border-accent hover:bg-accent/15',
    warning: 'border-warning/25 bg-warning/10 text-warning hover:border-warning hover:bg-warning/15',
    success: 'border-success/25 bg-success/10 text-success hover:border-success hover:bg-success/15',
    muted: 'border-border bg-background text-muted hover:border-accent hover:bg-accent/10 hover:text-text',
  }[tone]

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
        toneClass,
        muted ? 'opacity-40 grayscale hover:translate-y-0' : '',
      )}
      onClick={onClick}
      title={label}
    >
      {icon}
      {label}
    </button>
  )
}

export function TaskCard({
  task,
  onOpen,
  onStatusChange,
  onComplete,
  categories = fallbackTaskCategories,
  variant = 'compact',
  density = 'row',
}: {
  task: TaskWithProfiles
  onOpen: (task: TaskWithProfiles) => void
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<TaskWithProfiles>
  onComplete: (taskId: string) => Promise<TaskWithProfiles>
  categories?: TaskCategorySetting[]
  variant?: 'compact' | 'detailed'
  density?: 'row' | 'comfortable'
}) {
  const { profile } = useAuth()
  const [updating, setUpdating] = useState(false)
  const canQuickAct = canSeeTaskQuickActions(profile, task)
  const isClosed = task.status === 'completed' || task.status === 'cancelled'
  const overdue = isOverdue(task.due_date) && !isClosed
  const dueToday = isDueToday(task.due_date) && !isClosed
  const assignedName = task.assigned_to_profile?.full_name ?? 'Unassigned'
  const categoryName = getTaskCategoryName(categories, task.category)

  async function runAction(event: MouseEvent<HTMLButtonElement>, status: TaskStatus) {
    event.stopPropagation()
    setUpdating(true)
    try {
      if (status === 'completed') await onComplete(task.id)
      else await onStatusChange(task.id, status)
      toast.success(status === 'completed' ? 'Task completed' : 'Task updated')
    } catch {
      toast.error('Task update failed')
    } finally {
      setUpdating(false)
    }
  }

  const actions = canQuickAct ? (
    <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap">
      <ActionButton icon={<PlayCircle className="h-3.5 w-3.5" />} label="Start" tone="accent" muted={!(task.status === 'new' || task.status === 'waiting')} disabled={updating || isClosed || !(task.status === 'new' || task.status === 'waiting')} onClick={(event) => void runAction(event, 'in_progress')} />
      <ActionButton icon={<Clock className="h-3.5 w-3.5" />} label="Wait" tone="warning" muted={!(task.status === 'new' || task.status === 'in_progress')} disabled={updating || isClosed || !(task.status === 'new' || task.status === 'in_progress')} onClick={(event) => void runAction(event, 'waiting')} />
      <ActionButton icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Done" tone="success" muted={isClosed} disabled={updating || isClosed} onClick={(event) => void runAction(event, 'completed')} />
      {isClosed ? (
        <ActionButton icon={<RotateCcw className="h-3.5 w-3.5" />} label="Reopen" tone="muted" disabled={updating} onClick={(event) => void runAction(event, 'new')} />
      ) : null}
    </div>
  ) : null

  if (variant === 'compact') {
    const metadata = (
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-background px-2 py-1 text-[11px] font-semibold text-muted">
          <Tag className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{categoryName}</span>
        </span>
        {task.patient_reference ? <span className="inline-flex max-w-32 truncate rounded-full bg-accent/10 px-2 py-1 text-[11px] font-semibold text-accentDark">{task.patient_reference}</span> : null}
        {task.status === 'waiting' ? <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 text-[11px] font-semibold text-warning"><Clock className="h-3 w-3" /> Waiting</span> : null}
        {task.status === 'in_progress' ? <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-1 text-[11px] font-semibold text-accentDark"><PlayCircle className="h-3 w-3" /> Started</span> : null}
        {task.priority === 'urgent' ? <span className="inline-flex items-center gap-1 rounded-full bg-urgent/10 px-2 py-1 text-[11px] font-semibold text-urgent"><Flag className="h-3 w-3" /> Urgent</span> : null}
        {overdue ? <span className="inline-flex rounded-full bg-urgent px-2 py-1 text-[11px] font-semibold text-white">Overdue</span> : null}
      </div>
    )

    const rightMeta = (
      <button
        type="button"
        className={cn(
          'grid w-full min-w-0 justify-items-stretch gap-1.5 text-left text-xs text-muted',
          density === 'row'
            ? 'sm:grid-cols-2 sm:items-center lg:ml-auto lg:w-full lg:max-w-[320px] lg:grid-cols-1 lg:justify-items-end lg:text-right'
            : 'ml-auto w-full max-w-[260px] justify-items-end text-right',
        )}
        onClick={() => onOpen(task)}
      >
        <span className="inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-background/70 px-2 py-1.5 text-center">
          <Avatar name={task.assigned_to_profile?.full_name} id={task.assigned_to ?? undefined} className="h-7 w-7 rounded-xl text-[10px]" />
          <span className="min-w-0 truncate text-center font-semibold text-text" title={assignedName}>{assignedName}</span>
        </span>
        <span className={cn('inline-flex w-full items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-center font-semibold', overdue ? 'bg-urgent/10 text-urgent' : dueToday ? 'bg-accent/10 text-accentDark' : 'bg-background/70 text-muted')}>
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          {compactDueLabel(task.due_date)}
        </span>
      </button>
    )

    return (
      <article
        className={cn(
          'rounded-2xl border border-border bg-surface px-3 py-3 shadow-sm shadow-text/5 transition hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md',
          task.status === 'completed' ? 'opacity-60' : '',
          overdue ? 'border-urgent/40 border-l-4 border-l-urgent bg-urgent/5 shadow-urgent/10' : dueToday ? 'border-l-4 border-l-accent' : task.status === 'waiting' ? 'border-l-4 border-l-warning' : '',
        )}
      >
        <div className={cn(
          'grid gap-3',
          density === 'row'
            ? 'lg:grid-cols-[auto_minmax(0,1fr)_minmax(280px,320px)] lg:items-center'
            : 'sm:grid-cols-[minmax(0,1fr)_minmax(220px,260px)] sm:items-start',
        )}>
          <button type="button" className={cn('hidden text-left', density === 'row' ? 'lg:block' : '')} onClick={() => onOpen(task)} aria-label={`Open ${task.title}`}>
            <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border', statusTone(task.status))}>
              {renderStatusIcon(task.status)}
            </span>
          </button>

          <button type="button" className="min-w-0 text-left" onClick={() => onOpen(task)}>
            <span className={cn('flex items-start gap-3', density === 'row' ? 'lg:hidden' : '')}>
              <span className={cn('mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border', statusTone(task.status))}>
                {renderStatusIcon(task.status)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-semibold leading-5 text-text">{task.title}</span>
                {task.description ? <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted sm:line-clamp-1">{task.description}</span> : null}
                <span className="mt-2 block">{metadata}</span>
              </span>
            </span>
            <span className={cn('hidden min-w-0', density === 'row' ? 'lg:block' : '')}>
              <span className="line-clamp-2 text-sm font-semibold leading-5 text-text">{task.title}</span>
              {task.description ? <span className="mt-0.5 block truncate text-xs text-muted">{task.description}</span> : null}
              <span className="mt-2 block">{metadata}</span>
            </span>
          </button>

          <div className={cn('space-y-2', density === 'row' ? 'lg:justify-self-end lg:text-right' : 'sm:justify-self-end sm:text-right')}>
            {rightMeta}
            <div className={cn('flex justify-center', density === 'row' ? 'lg:justify-end' : 'sm:justify-end')}>{actions}</div>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article
      className={cn(
        'grid gap-4 rounded-3xl border border-border bg-surface p-4 shadow-sm shadow-text/5 transition hover:-translate-y-0.5 hover:shadow-md',
        task.status === 'completed' ? 'opacity-60' : '',
        overdue ? 'border-l-4 border-l-urgent' : '',
      )}
    >
      <button type="button" className="grid gap-3 text-left" onClick={() => onOpen(task)}>
        <span className="flex items-start gap-3">
          <span className={cn('mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border', statusTone(task.status))}>
            {renderStatusIcon(task.status)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', statusTone(task.status))}>
                {statusLabel(task.status)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs font-medium text-muted">
                <Tag className="h-3 w-3" /> {categoryName}
              </span>
              {task.priority === 'urgent' ? <span className="inline-flex items-center gap-1 rounded-full bg-urgent/10 px-2.5 py-1 text-xs font-semibold text-urgent"><Flag className="h-3 w-3" /> Urgent</span> : null}
            </span>
            <span className="mt-2 block text-base font-semibold leading-6 text-text">{task.title}</span>
            {task.description ? <span className="mt-1 line-clamp-2 block text-sm leading-6 text-muted">{task.description}</span> : <span className="mt-1 block text-sm text-muted/70">No extra details added.</span>}
          </span>
        </span>

        <span className="grid gap-3 rounded-2xl bg-background/70 p-3 text-sm text-muted sm:grid-cols-[1.2fr_1fr]">
          <span className="flex min-w-0 items-center gap-3 rounded-2xl bg-surface px-3 py-2 shadow-sm shadow-text/5">
            <Avatar name={task.assigned_to_profile?.full_name} id={task.assigned_to ?? undefined} className="h-9 w-9 rounded-2xl text-xs" />
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">For</span>
              <span className="block truncate font-semibold text-text">{assignedName}</span>
            </span>
          </span>
          <span className={cn('flex items-center gap-2 rounded-2xl bg-surface px-3 py-2 shadow-sm shadow-text/5', overdue ? 'font-semibold text-urgent' : '')}>
            <Calendar className="h-4 w-4 shrink-0" />
            <span>
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Due</span>
              <span className="block font-semibold">{formatDueDate(task.due_date)}</span>
            </span>
          </span>
          <span className="flex min-w-0 items-center gap-2 sm:col-span-2">
            <UserRound className="h-4 w-4 shrink-0 text-muted" />
            <span className="truncate text-xs">
              Created by <span className="font-semibold text-text">{task.created_by_profile?.full_name ?? 'Unknown'}</span>
            </span>
          </span>
          {task.patient_reference ? <span className="font-semibold text-accentDark sm:col-span-2">Reference: {task.patient_reference}</span> : null}
        </span>
      </button>

      {actions ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
          {actions}
          <span className="ml-auto hidden text-xs text-muted sm:inline">Open card for details</span>
        </div>
      ) : null}
    </article>
  )
}
