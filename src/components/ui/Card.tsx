import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl border border-border/80 bg-surface p-5 shadow-sm shadow-text/5', className)}
      {...props}
    >
      {children}
    </div>
  )
}
