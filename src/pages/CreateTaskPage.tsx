import { TaskForm } from '../components/tasks/TaskForm'
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { StickyNote } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { DateTimePicker } from '../components/ui/DateTimePicker'
import { Input } from '../components/ui/Input'
import { Switch } from '../components/ui/Switch'
import { Textarea } from '../components/ui/Textarea'
import { createHandoverNote } from '../lib/handover'
import { cn } from '../lib/cn'

function todayString() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function NoteForm() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [hasExpiry, setHasExpiry] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (title.trim().length < 3) {
      toast.error('Add a short note title')
      return
    }

    setSaving(true)
    try {
      const note = await createHandoverNote({
        title,
        body,
        pinned,
        shift_date: todayString(),
        expires_at: hasExpiry ? expiresAt || null : null,
      })
      toast.success('Note created')
      navigate(`/handover?note=${note.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Note could not be created')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="rounded-3xl">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input className="h-14 text-lg font-semibold" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What should the team know?" />
        <Textarea className="min-h-32" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add a quick note, optional" />
        <button
          type="button"
          className="flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl border border-border bg-background px-4 text-left transition hover:border-accent"
          onClick={() => setPinned((value) => !value)}
        >
          <span>
            <span className="block text-sm font-semibold text-text">Pin note</span>
            <span className="block text-xs text-muted">Keep this note at the top today.</span>
          </span>
          <span onClick={(event) => event.stopPropagation()}>
            <Switch checked={pinned} onChange={setPinned} label="Pin note" />
          </span>
        </button>
        <button
          type="button"
          className="flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl border border-border bg-background px-4 text-left transition hover:border-accent"
          onClick={() => setHasExpiry((value) => !value)}
        >
          <span>
            <span className="block text-sm font-semibold text-text">Set expiry</span>
            <span className="block text-xs text-muted">Hide this note after a chosen date and time.</span>
          </span>
          <span onClick={(event) => event.stopPropagation()}>
            <Switch checked={hasExpiry} onChange={setHasExpiry} label="Set expiry" />
          </span>
        </button>
        {hasExpiry ? <DateTimePicker value={expiresAt || null} onChange={(value) => setExpiresAt(value ?? '')} label="Note expiry" /> : null}
        <div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="secondary" onClick={() => navigate('/handover')}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creating' : 'Create note'}</Button>
        </div>
      </form>
    </Card>
  )
}

export function CreateTaskPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const type = searchParams.get('type') === 'note' ? 'note' : 'task'

  return (
    <div className="mx-auto max-w-[720px] space-y-6">
      <div>
        <h1 className="font-heading text-4xl font-semibold text-text md:text-5xl">{type === 'note' ? 'New note' : 'New task'}</h1>
        <p className="mt-2 text-muted">
          {type === 'note' ? 'Leave a quick reminder or shift note for the team.' : 'Create a quick task for yourself or someone else.'}
        </p>
      </div>
      <div className="flex rounded-2xl border border-border bg-surface p-1">
        {[
          ['task', 'Task'],
          ['note', 'Note'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={cn(
              'flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition',
              type === value ? 'bg-accent/10 text-accentDark' : 'text-muted hover:bg-background hover:text-text',
            )}
            onClick={() => setSearchParams(value === 'note' ? { type: 'note' } : {})}
          >
            {label}
          </button>
        ))}
      </div>
      {type === 'note' ? <NoteForm /> : <TaskForm />}
      {type === 'note' ? (
        <p className="flex items-center gap-2 rounded-2xl bg-background px-4 py-3 text-sm text-muted">
          <StickyNote className="h-4 w-4" /> Keep notes workplace-only. Do not add private medical details.
        </p>
      ) : null}
    </div>
  )
}
