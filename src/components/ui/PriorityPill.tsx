import type { TaskPriority } from '../../types/database'
import { cn } from '../../lib/cn'

const labels: Record<TaskPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  urgent: 'Urgent',
}

const styles: Record<TaskPriority, string> = {
  low: 'border-border text-muted',
  normal: 'border-accent text-accentDark',
  urgent: 'border-urgent text-urgent',
}

export function PriorityPill({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border bg-surface px-3 py-1 text-xs font-semibold',
        styles[priority],
      )}
    >
      {labels[priority]}
    </span>
  )
}
