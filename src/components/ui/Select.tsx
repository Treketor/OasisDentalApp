import { Children, isValidElement, useEffect, useMemo, useState, type ChangeEvent, type ReactNode, type SelectHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

interface SelectOption {
  value: string
  label: ReactNode
  disabled?: boolean
}

function getOptionText(label: ReactNode) {
  if (typeof label === 'string' || typeof label === 'number') return String(label)
  return 'Option'
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const [open, setOpen] = useState(false)
  const value = String(props.value ?? props.defaultValue ?? '')
  const options = useMemo(
    () =>
      Children.toArray(children).flatMap((child): SelectOption[] => {
        if (!isValidElement<{ value?: string; children?: ReactNode; disabled?: boolean }>(child)) return []
        if (child.type !== 'option') return []
        const optionValue = child.props.value ?? ''
        return [{ value: String(optionValue), label: child.props.children, disabled: child.props.disabled }]
      }),
    [children],
  )
  const selected = options.find((option) => option.value === value) ?? options[0]
  const disabled = Boolean(props.disabled)

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  function choose(nextValue: string) {
    const event = {
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as ChangeEvent<HTMLSelectElement>
    props.onChange?.(event)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        className={cn(
          'flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-2 text-left text-sm font-semibold text-text outline-none transition hover:border-accent focus:border-accent focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={cn('min-w-0 truncate', !value ? 'text-muted' : '')}>{selected ? selected.label : 'Choose'}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted transition', open ? 'rotate-180' : '')} aria-hidden="true" />
      </button>

      {open ? createPortal(
        <div
          data-oasis-floating-layer="true"
          className="fixed inset-0 z-[1000] flex items-start justify-center bg-background/20 px-3 pt-16 backdrop-blur-sm md:pt-[12vh]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div className="w-[min(420px,calc(100vw-2rem))] animate-[modalIn_.16s_ease-out] overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl shadow-text/15">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-text">Choose option</p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2" role="listbox" aria-label="Choose option">
              {options.map((option) => (
                <button
                  key={`${option.value}-${getOptionText(option.label)}`}
                  type="button"
                  disabled={option.disabled}
                  className={cn(
                    'flex min-h-12 w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50',
                    value === option.value ? 'bg-accent/10 text-accentDark' : 'text-text',
                  )}
                  onClick={() => choose(option.value)}
                  role="option"
                  aria-selected={value === option.value}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {value === option.value ? <span className="text-xs text-accentDark">Selected</span> : null}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
