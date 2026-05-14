import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarClock, CheckCircle2, Edit3, Pin, PinOff, PlusCircle, StickyNote, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../components/auth/useAuth'
import { Badge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { DateTimePicker } from '../components/ui/DateTimePicker'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Switch } from '../components/ui/Switch'
import { Textarea } from '../components/ui/Textarea'
import { useHandoverNotes } from '../hooks/useHandoverNotes'
import { useWorkspacePermissions } from '../hooks/useWorkspacePermissions'
import type { HandoverNoteWithProfile } from '../lib/handover'
import { cn } from '../lib/cn'
import { isManagerOrAdmin } from '../lib/permissions'
import { formatDateTime } from '../lib/taskLabels'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

function isNoteExpired(note: HandoverNoteWithProfile, nowMs: number) {
  return Boolean(note.expires_at && nowMs && new Date(note.expires_at).getTime() <= nowMs)
}

function NoteActionButton({
  icon,
  label,
  tone = 'default',
  onClick,
}: {
  icon: React.ReactNode
  label: string
  tone?: 'default' | 'success' | 'danger'
  onClick: () => void
}) {
  const toneClass = {
    default: 'hover:border-accent hover:bg-accent/10 hover:text-accentDark',
    success: 'hover:border-success hover:bg-success/10 hover:text-success',
    danger: 'hover:border-urgent hover:bg-urgent/10 hover:text-urgent',
  }[tone]

  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-muted transition',
        toneClass,
      )}
      onClick={onClick}
      title={label}
    >
      {icon}
      {label}
    </button>
  )
}

function todayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function HandoverCard({
  note,
  highlighted,
  canDelete,
  canEdit,
  canResolve,
  onEdit,
  onPin,
  onResolve,
  onDelete,
  nowMs,
}: {
  note: HandoverNoteWithProfile
  highlighted?: boolean
  canDelete: boolean
  canEdit: boolean
  canResolve: boolean
  onEdit: (note: HandoverNoteWithProfile) => void
  onPin: (note: HandoverNoteWithProfile) => void
  onResolve: (note: HandoverNoteWithProfile) => void
  onDelete: (note: HandoverNoteWithProfile) => void
  nowMs: number
}) {
  return (
    <article
      id={`handover-${note.id}`}
      className={cn(
        'rounded-2xl border border-border bg-surface p-4 shadow-sm shadow-text/5 transition hover:-translate-y-0.5 hover:shadow-md',
        note.pinned ? 'border-accent/50' : '',
        highlighted ? 'border-accent bg-accent/5' : '',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-text">{note.title}</h3>
            {note.pinned ? <Badge className="border-accent/30 bg-accent/10 text-accentDark"><Pin className="mr-1 h-3 w-3" /> Pinned</Badge> : null}
            {note.resolved_at ? <Badge className="border-success/30 bg-success/10 text-success"><CheckCircle2 className="mr-1 h-3 w-3" /> Resolved</Badge> : null}
          </div>
          {note.body ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{note.body}</p> : null}
          <p className="mt-3 flex items-center gap-2 text-xs text-muted">
            <Avatar name={note.created_by_profile?.full_name} id={note.created_by} className="h-6 w-6 rounded-xl text-[10px]" />
            {note.created_by_profile?.full_name ?? 'Staff'} - {formatDateTime(note.created_at)}
          </p>
          {note.expires_at ? (
            <p className={cn('mt-2 flex items-center gap-1.5 text-xs font-medium', isNoteExpired(note, nowMs) ? 'text-urgent' : 'text-muted')}>
              <CalendarClock className="h-3.5 w-3.5" />
              Expires {formatDateTime(note.expires_at)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {canEdit && !note.resolved_at ? (
            <>
              <NoteActionButton icon={<Edit3 className="h-4 w-4" />} label="Edit" onClick={() => onEdit(note)} />
              <NoteActionButton icon={note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />} label={note.pinned ? 'Unpin' : 'Pin'} onClick={() => onPin(note)} />
            </>
          ) : null}
          {canResolve && !note.resolved_at ? (
            <NoteActionButton icon={<CheckCircle2 className="h-4 w-4" />} label="Resolve" tone="success" onClick={() => onResolve(note)} />
          ) : null}
          {canDelete ? (
            <NoteActionButton icon={<Trash2 className="h-4 w-4" />} label="Delete" tone="danger" onClick={() => onDelete(note)} />
          ) : null}
        </div>
      </div>
    </article>
  )
}

export function HandoverPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()
  const [searchParams] = useSearchParams()
  const canManage = isManagerOrAdmin(profile)
  const { values: workspacePermissions } = useWorkspacePermissions()
  const today = todayString()
  const { data: notes, loading, error, update, resolve, delete: deleteNote } = useHandoverNotes({
    shiftDate: today,
    includeResolved: true,
  })
  const [editing, setEditing] = useState<HandoverNoteWithProfile | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [hasExpiry, setHasExpiry] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const highlightedNoteId = searchParams.get('note')
  const [noteToDelete, setNoteToDelete] = useState<HandoverNoteWithProfile | null>(null)
  const [deletingNote, setDeletingNote] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60000)
    return () => window.clearInterval(intervalId)
  }, [])

  const activeNotes = useMemo(() => notes.filter((note) => !isNoteExpired(note, nowMs)), [notes, nowMs])
  const pinnedNotes = useMemo(() => activeNotes.filter((note) => note.pinned && !note.resolved_at), [activeNotes])
  const openNotes = useMemo(() => activeNotes.filter((note) => !note.pinned && !note.resolved_at), [activeNotes])
  const resolvedNotes = useMemo(() => notes.filter((note) => note.resolved_at).slice(0, 6), [notes])

  function resetForm() {
    setEditing(null)
    setTitle('')
    setBody('')
    setPinned(false)
    setHasExpiry(false)
    setExpiresAt('')
  }

  function startEdit(note: HandoverNoteWithProfile) {
    setEditing(note)
    setTitle(note.title)
    setBody(note.body ?? '')
    setPinned(note.pinned)
    setHasExpiry(Boolean(note.expires_at))
    setExpiresAt(note.expires_at ?? '')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (title.trim().length < 3) {
      toast.error('Add a clear handover title')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await update(editing.id, { title, body, pinned, expires_at: hasExpiry ? expiresAt || null : null })
        toast.success('Handover note updated')
      }
      resetForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Handover note could not be saved')
    } finally {
      setSaving(false)
    }
  }

  async function handleResolve(note: HandoverNoteWithProfile) {
    try {
      await resolve(note.id)
      toast.success('Handover note resolved')
    } catch {
      toast.error('Could not resolve handover note')
    }
  }

  async function handleDelete(note: HandoverNoteWithProfile) {
    try {
      await deleteNote(note.id)
      toast.success('Handover note deleted')
    } catch {
      toast.error('Could not delete handover note')
    }
  }

  function canEditNote(note: HandoverNoteWithProfile) {
    return canManage || (note.created_by === profile?.id && workspacePermissions.staff_can_edit_own_notes)
  }

  function canDeleteNote(note: HandoverNoteWithProfile) {
    return canManage || (note.created_by === profile?.id && workspacePermissions.staff_can_delete_own_notes)
  }

  function canResolveNote(note: HandoverNoteWithProfile) {
    return canManage || note.created_by === profile?.id || workspacePermissions.staff_can_resolve_any_note
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-4xl font-semibold text-text md:text-5xl">Notes</h1>
          <p className="mt-2 max-w-3xl text-muted">
            Quick reminders and shift notes for the team. Keep notes workplace-only. Do not add private medical details.
          </p>
        </div>
        <Button type="button" className="gap-2" onClick={() => navigate('/create?type=note')}>
          <PlusCircle className="h-4 w-4" />
          New note
        </Button>
      </div>

      {editing ? <Card>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Note title" />
          <Textarea className="md:col-span-2" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Note, optional" />
          <button
            type="button"
            className="flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-border bg-background px-4 text-left transition hover:border-accent"
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
            className="flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-border bg-background px-4 text-left transition hover:border-accent"
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
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>{saving ? 'Saving' : editing ? 'Update note' : 'Create note'}</Button>
            {editing ? <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button> : null}
          </div>
        </form>
      </Card> : null}

      {error ? <p className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-muted">{error}</p> : null}
      {loading ? <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">Loading handover notes...</p> : null}

      {!loading ? (
        <div className="grid gap-6">
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-heading text-2xl font-semibold text-text"><Pin className="h-5 w-5 text-accentDark" /> Pinned</h2>
            {pinnedNotes.length === 0 ? <EmptyState title="No pinned notes" message="Pinned handover items will stay at the top for the shift." /> : (
              <div className="grid gap-3">
                {pinnedNotes.map((note) => (
                  <HandoverCard
                    key={note.id}
                    note={note}
                    highlighted={note.id === highlightedNoteId}
                    canDelete={canDeleteNote(note) && isOnline}
                    canEdit={canEditNote(note)}
                    canResolve={canResolveNote(note)}
                    onEdit={startEdit}
                    onPin={(item) => void update(item.id, { pinned: !item.pinned })}
                    onResolve={(item) => { if (canResolveNote(item)) void handleResolve(item) }}
                    onDelete={(item) => { if (isOnline) setNoteToDelete(item) }}
                    nowMs={nowMs}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-heading text-2xl font-semibold text-text"><StickyNote className="h-5 w-5 text-accentDark" /> Today</h2>
            {openNotes.length === 0 ? <EmptyState title="No open notes" message="Use New note when the next shift needs context." /> : (
              <div className="grid gap-3">
                {openNotes.map((note) => (
                  <HandoverCard
                    key={note.id}
                    note={note}
                    highlighted={note.id === highlightedNoteId}
                    canDelete={canDeleteNote(note) && isOnline}
                    canEdit={canEditNote(note)}
                    canResolve={canResolveNote(note)}
                    onEdit={startEdit}
                    onPin={(item) => void update(item.id, { pinned: !item.pinned })}
                    onResolve={(item) => { if (canResolveNote(item)) void handleResolve(item) }}
                    onDelete={(item) => { if (isOnline) setNoteToDelete(item) }}
                    nowMs={nowMs}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-heading text-2xl font-semibold text-text"><CheckCircle2 className="h-5 w-5 text-success" /> Recently resolved</h2>
            {resolvedNotes.length === 0 ? <EmptyState title="No resolved notes" message="Resolved items from today will appear here." /> : (
              <div className="grid gap-3">
                {resolvedNotes.map((note) => (
                  <HandoverCard
                    key={note.id}
                    note={note}
                    highlighted={note.id === highlightedNoteId}
                    canDelete={canDeleteNote(note) && isOnline}
                    canEdit={false}
                    canResolve={false}
                    onEdit={startEdit}
                    onPin={(item) => void update(item.id, { pinned: !item.pinned })}
                    onResolve={(item) => void handleResolve(item)}
                    onDelete={(item) => { if (isOnline) setNoteToDelete(item) }}
                    nowMs={nowMs}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
      <ConfirmDialog
        isOpen={Boolean(noteToDelete)}
        title="Delete handover note"
        message={`This permanently removes "${noteToDelete?.title ?? 'this note'}" from the handover list.`}
        confirmLabel="Delete note"
        loading={deletingNote}
        onCancel={() => setNoteToDelete(null)}
        onConfirm={async () => {
          if (!noteToDelete) return
          setDeletingNote(true)
          await handleDelete(noteToDelete)
          setDeletingNote(false)
          setNoteToDelete(null)
        }}
      />
    </div>
  )
}
