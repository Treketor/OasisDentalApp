import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '../../lib/cn'

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseValue(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function nextMonday() {
  const date = new Date()
  const day = date.getDay()
  const days = day === 1 ? 7 : (8 - day) % 7
  date.setDate(date.getDate() + days)
  date.setHours(9, 0, 0, 0)
  return date
}

function formatDateTimePickerValue(value: string | null) {
  const date = parseValue(value)
  if (!date) return 'No due date'
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0
  const day = date.toDateString() === today.toDateString()
    ? 'Today'
    : date.toDateString() === tomorrow.toDateString()
      ? 'Tomorrow'
      : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' }).format(date)

  if (!hasTime) return day
  return `${day}, ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)}`
}

function makeIso(date: Date, time: string) {
  const next = new Date(date)
  if (time) {
    const [hours, minutes] = time.split(':').map(Number)
    next.setHours(hours || 0, minutes || 0, 0, 0)
  } else {
    next.setHours(0, 0, 0, 0)
  }
  return next.toISOString()
}

export function DateTimePicker({
  value,
  onChange,
  label = 'Due date',
}: {
  value: string | null
  onChange: (value: string | null) => void
  label?: string
}) {
  const selected = parseValue(value)
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => selected ?? new Date())
  const [time, setTime] = useState(() => selected ? `${pad(selected.getHours())}:${pad(selected.getMinutes())}` : '')

  useEffect(() => {
    if (!open) return undefined
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const start = new Date(first)
    start.setDate(first.getDate() - first.getDay())
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start)
      day.setDate(start.getDate() + index)
      return day
    })
  }, [month])

  function choose(date: Date, nextTime = time) {
    onChange(makeIso(date, nextTime))
    setMonth(date)
  }

  function updateTime(nextTime: string) {
    setTime(nextTime)
    if (selected) onChange(makeIso(selected, nextTime))
  }

  function quick(date: Date | null) {
    if (!date) {
      onChange(null)
      setTime('')
      setOpen(false)
      return
    }
    choose(date, time)
    setOpen(false)
  }

  const selectedKey = selected ? dateKey(selected) : ''
  const todayKey = dateKey(new Date())

  return (
    <div className="relative">
      <button
        type="button"
        className="flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 text-left text-sm text-text outline-none transition hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent/20"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-muted" />
          <span className={value ? 'truncate' : 'truncate text-muted'}>{formatDateTimePickerValue(value)}</span>
        </span>
        {value ? <X className="h-4 w-4 shrink-0 text-muted" onClick={(event) => { event.stopPropagation(); onChange(null); setTime('') }} /> : null}
      </button>
      {open ? createPortal(
        <div
          data-oasis-floating-layer="true"
          className="fixed inset-0 z-[1000] flex items-start justify-center bg-background/20 px-3 pt-16 backdrop-blur-sm md:pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
        <div className="w-[min(360px,calc(100vw-2rem))] animate-[modalIn_.16s_ease-out] rounded-3xl border border-border bg-surface p-4 shadow-2xl shadow-text/15">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="font-semibold text-text">{label}</p>
            <div className="flex gap-1">
              <button type="button" className="rounded-xl p-2 text-muted hover:bg-background hover:text-text" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" className="rounded-xl p-2 text-muted hover:bg-background hover:text-text" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" className="rounded-full bg-background px-3 py-1.5 text-xs font-semibold text-muted hover:text-text" onClick={() => quick(new Date())}>Today</button>
            <button type="button" className="rounded-full bg-background px-3 py-1.5 text-xs font-semibold text-muted hover:text-text" onClick={() => { const date = new Date(); date.setDate(date.getDate() + 1); quick(date) }}>Tomorrow</button>
            <button type="button" className="rounded-full bg-background px-3 py-1.5 text-xs font-semibold text-muted hover:text-text" onClick={() => quick(nextMonday())}>Next Monday</button>
            <button type="button" className="rounded-full bg-background px-3 py-1.5 text-xs font-semibold text-muted hover:text-text" onClick={() => quick(null)}>Clear</button>
          </div>
          <div className="mb-2 text-center text-sm font-semibold text-text">
            {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => <span key={day} className="py-1">{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = dateKey(day)
              const active = key === selectedKey
              const currentMonth = day.getMonth() === month.getMonth()
              return (
                <button
                  key={key}
                  type="button"
                  className={cn(
                    'aspect-square rounded-xl text-sm font-medium transition',
                    active ? 'bg-accent text-surface' : key === todayKey ? 'bg-accent/10 text-accentDark' : 'hover:bg-background',
                    !currentMonth && !active ? 'text-muted/40' : 'text-text',
                  )}
                  onClick={() => choose(day)}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-text">Time optional</p>
              {time ? (
                <button type="button" className="text-xs font-semibold text-muted hover:text-text" onClick={() => updateTime('')}>
                  Clear time
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['09:00', '9:00 am'],
                ['12:00', '12:00 pm'],
                ['14:30', '2:30 pm'],
                ['17:00', '5:00 pm'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    'h-11 rounded-2xl border px-3 text-sm font-semibold transition',
                    time === value ? 'border-accent bg-accent/10 text-accentDark' : 'border-border bg-background text-muted hover:border-accent hover:text-text',
                  )}
                  onClick={() => updateTime(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="time"
              value={time}
              onChange={(event) => updateTime(event.target.value)}
              className="mt-3 h-12 w-full rounded-2xl border border-border bg-background px-4 text-base font-medium text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
