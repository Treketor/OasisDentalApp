import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
}

export function Badge({ children, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-muted',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
