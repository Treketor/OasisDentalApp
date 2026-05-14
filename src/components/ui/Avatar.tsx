import { cn } from '../../lib/cn'

const tones = [
  'bg-accent/15 text-accentDark',
  'bg-success/15 text-success',
  'bg-warning/15 text-warning',
  'bg-border text-text',
  'bg-background text-muted',
]

function initialsFromName(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}

function toneFor(value?: string | null) {
  const source = value || ''
  const sum = source.split('').reduce((total, char) => total + char.charCodeAt(0), 0)
  return tones[sum % tones.length]
}

export function Avatar({ name, id, className }: { name?: string | null; id?: string | null; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-semibold',
        toneFor(id || name),
        className,
      )}
      aria-label={name || 'Staff member'}
    >
      {initialsFromName(name)}
    </span>
  )
}
