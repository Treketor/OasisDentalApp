import { cn } from '../../lib/cn'

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-transparent transition disabled:cursor-not-allowed disabled:opacity-60',
        checked ? 'bg-accent' : 'bg-border',
      )}
      onClick={() => onChange(!checked)}
    >
      <span className={cn('h-5 w-5 rounded-full bg-surface shadow-sm transition', checked ? 'translate-x-5' : 'translate-x-1')} />
    </button>
  )
}
