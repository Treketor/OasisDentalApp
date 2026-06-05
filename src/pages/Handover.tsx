import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../components/auth/useAuth'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { useHandoverNotes } from '../hooks/useHandoverNotes'
import type { HandoverNoteWithProfile } from '../lib/handover'
import { isManagerOrAdmin } from '../lib/permissions'

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function canUpdateNote(note: HandoverNoteWithProfile, profileId?: string, managerOrAdmin = false) {
  return managerOrAdmin || note.created_by === profileId
}

function NoteCard({
  note,
  canUpdate,
  canDelete,
  onUpdate,
  onTogglePin,
  onResolve,
  onDelete,
}: {
  note: HandoverNoteWithProfile
  canUpdate: boolean
  canDelete: boolean
  onUpdate: (note: HandoverNoteWithProfile) => void
  onTogglePin: (note: HandoverNoteWithProfile) => void
  onResolve: (noteId: string) => void
  onDelete: (noteId: string) => void
}) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        {note.pinned ? <Badge className="border-accent text-accentDark">Pinned</Badge> : null}
        {note.location ? <Badge>{note.location}</Badge> : null}
        {note.resolved_at ? <Badge className="border-success text-success">Resolved</Badge> : null}
      </div>
      <h3 className="mt-3 font-semibold text-text">{note.title}</h3>
      {note.body ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{note.body}</p> : null}
      <p className="mt-3 text-xs text-muted">
        {note.created_by_profile?.full_name ?? 'Staff'} · {new Date(note.created_at).toLocaleString()}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {canUpdate && !note.resolved_at ? (
          <>
            <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => onUpdate(note)}>
              Edit
            </Button>
            <Button type="button" variant="ghost" className="h-9 px-3" onClick={() => onResolve(note.id)}>
              Resolve
            </Button>
            <Button type="button" variant="ghost" className="h-9 px-3" onClick={() => onTogglePin(note)}>
              {note.pinned ? 'Unpin' : 'Pin'}
            </Button>
          </>
        ) : null}
        {canDelete ? (
          <Button type="button" variant="ghost" className="h-9 px-3 text-urgent" onClick={() => onDelete(note.id)}>
            Delete
          </Button>
        ) : null}
      </div>
    </article>
  )
}

export function HandoverPage() {
  const { profile } = useAuth()
  const managerOrAdmin = isManagerOrAdmin(profile)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [location, setLocation] = useState(profile?.location ?? '')
  const [pinned, setPinned] = useState(false)
  const [editingNote, setEditingNote] = useState<HandoverNoteWithProfile | null>(null)
  const { notes, loading, error, createHandoverNote, updateHandoverNote, resolveHandoverNote, deleteHandoverNote } = useHandoverNotes({
    shift_date: todayDate(),
    includeResolved: true,
  })

  const pinnedNotes = useMemo(() => notes.filter((note) => note.pinned && !note.resolved_at), [notes])
  const openNotes = useMemo(() => notes.filter((note) => !note.pinned && !note.resolved_at), [notes])
  const resolvedNotes = useMemo(
    () => notes.filter((note) => note.resolved_at).sort((a, b) => new Date(b.resolved_at ?? b.updated_at).getTime() - new Date(a.resolved_at ?? a.updated_at).getTime()).slice(0, 5),
    [notes],
  )

  function resetForm() {
    setTitle('')
    setBody('')
    setLocation(profile?.location ?? '')
    setPinned(false)
    setEditingNote(null)
  }

  function startEdit(note: HandoverNoteWithProfile) {
    setEditingNote(note)
    setTitle(note.title)
    setBody(note.body ?? '')
    setLocation(note.location ?? '')
    setPinned(note.pinned)
  }

  async function handlePinToggle(note: HandoverNoteWithProfile) {
    try {
      await updateHandoverNote(note.id, { pinned: !note.pinned })
      toast.success(note.pinned ? 'Note unpinned' : 'Note pinned')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Handover note could not be updated')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (title.trim().length < 3) {
      toast.error('Add a clear note title')
      return
    }

    try {
      if (editingNote) {
        await updateHandoverNote(editingNote.id, { title, body, location, pinned })
        toast.success('Handover note updated')
      } else {
        await createHandoverNote({ title, body, location, pinned })
        toast.success('Handover note added')
      }
      resetForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Handover note could not be saved')
    }
  }

  async function handleResolve(noteId: string) {
    try {
      await resolveHandoverNote(noteId)
      toast.success('Handover note resolved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Handover note could not be resolved')
    }
  }

  async function handleDelete(noteId: string) {
    try {
      await deleteHandoverNote(noteId)
      toast.success('Handover note deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Handover note could not be deleted')
    }
  }

  function renderNotes(items: HandoverNoteWithProfile[], empty: string) {
    if (items.length === 0) return <EmptyState title="Nothing here" message={empty} />

    return (
      <div className="grid gap-3">
        {items.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            canUpdate={canUpdateNote(note, profile?.id, managerOrAdmin)}
            canDelete={managerOrAdmin}
            onUpdate={startEdit}
            onTogglePin={(note) => void handlePinToggle(note)}
            onResolve={(noteId) => void handleResolve(noteId)}
            onDelete={(noteId) => void handleDelete(noteId)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-heading text-5xl font-bold uppercase text-text">Handover</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Use this for shift notes, operational reminders, and non-sensitive handover items. Do not enter detailed patient or medical information.
        </p>
      </div>

      {error ? <p className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-muted">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <h2 className="font-heading text-3xl font-semibold uppercase text-text">{editingNote ? 'Edit Note' : 'Create Note'}</h2>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" />
            <Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Optional note" />
            <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location" />
            <label className="flex items-center gap-3 text-sm font-semibold text-text">
              <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
              Pin for today
            </label>
            <p className="text-xs leading-5 text-muted">Operational/admin notes only. Use initials or internal references if needed.</p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">{editingNote ? 'Save note' : 'Add note'}</Button>
              {editingNote ? (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          {loading ? <p className="text-sm text-muted">Loading handover...</p> : null}
          <section>
            <h2 className="mb-3 font-heading text-3xl font-semibold uppercase text-text">Today’s Pinned</h2>
            {!loading ? renderNotes(pinnedNotes, 'No pinned handover notes for today.') : null}
          </section>
          <section>
            <h2 className="mb-3 font-heading text-3xl font-semibold uppercase text-text">Today’s Open Notes</h2>
            {!loading ? renderNotes(openNotes, 'No open handover notes for today.') : null}
          </section>
          <section>
            <h2 className="mb-3 font-heading text-3xl font-semibold uppercase text-text">Recently Resolved</h2>
            {!loading ? renderNotes(resolvedNotes, 'Resolved notes will appear here.') : null}
          </section>
        </div>
      </div>
    </div>
  )
}
