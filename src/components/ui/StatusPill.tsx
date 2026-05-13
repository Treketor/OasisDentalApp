import type { TaskStatus } from '../../types/database'
import { cn } from '../../lib/cn'

const labels: Record<TaskStatus, string> = {
  new: 'New',
  in_progress: 'In progress',
  waiting: 'Waiting',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const styles: Record<TaskStatus, string> = {
  new: 'border-border text-muted',
  in_progress: 'border-accent text-accentDark',
  waiting: 'border-warning text-warning',
  completed: 'border-success text-success',
  cancelled: 'border-muted text-muted',
}

export function StatusPill({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border bg-surface px-3 py-1 text-xs font-semibold',
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  )
}
