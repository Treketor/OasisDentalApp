import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-32 w-full resize-y rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent',
        className,
      )}
      {...props}
    />
  )
}
