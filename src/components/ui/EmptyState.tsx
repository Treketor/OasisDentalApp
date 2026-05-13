import type { ReactNode } from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
  children?: ReactNode
}

export function EmptyState({ title, message, actionLabel, onAction, children }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center">
      <h3 className="font-heading text-2xl font-semibold uppercase text-text">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{message}</p>
      {actionLabel && onAction ? (
        <Button type="button" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
      {children}
    </div>
  )
}
