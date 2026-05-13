import { cn } from '../../lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-border/60', className)} />
}

export function TaskListSkeleton() {
  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-surface">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-3 px-5 py-4">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  )
}
