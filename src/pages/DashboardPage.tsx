import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Pin, PlusCircle, StickyNote } from 'lucide-react'
import { useAuth } from '../components/auth/useAuth'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { TaskCard } from '../components/tasks/TaskCard'
import { useTaskModal } from '../components/tasks/useTaskModal'
import { useHandoverNotes } from '../hooks/useHandoverNotes'
import { useProfiles } from '../hooks/useProfiles'
import { useTaskCategories } from '../hooks/useTaskCategories'
import { useTasks } from '../hooks/useTasks'
import { formatRelativeTime, getGreeting, isDueToday, isOverdue } from '../lib/dates'
import { isManagerOrAdmin } from '../lib/permissions'
import { formatDateTime } from '../lib/taskLabels'

function todayString() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function Section({
  title,
  href,
  linkLabel = 'View all',
  children,
  secondary = false,
}: {
  title: string
  href?: string
  linkLabel?: string
  children: React.ReactNode
  secondary?: boolean
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className={secondary ? 'font-heading text-xl font-semibold text-text' : 'font-heading text-2xl font-semibold text-text'}>{title}</h2>
        {href ? (
          <Link
            to={href}
            className="inline-flex h-9 items-center gap-1.5 rounded-2xl border border-border bg-surface px-3 text-xs font-semibold text-text shadow-sm shadow-text/5 transition hover:-translate-y-0.5 hover:border-accent hover:bg-accent/10 hover:text-accentDark"
          >
            {linkLabel}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { openTask } = useTaskModal()
  const { profile } = useAuth()
  const { tasks, loading, error, updateTaskStatus, completeTask } = useTasks()
  const { data: categories } = useTaskCategories()
  const { pendingProfiles } = useProfiles()
  const { data: notes, error: notesError } = useHandoverNotes({ shiftDate: todayString(), limit: 3 })
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60000)
    return () => window.clearInterval(intervalId)
  }, [])

  const openTasks = useMemo(() => tasks.filter((task) => task.status !== 'completed' && task.status !== 'cancelled'), [tasks])
  const mine = [...openTasks]
    .filter((task) => task.assigned_to === profile?.id)
    .sort((a, b) => {
      const weight = (task: typeof a) => (isOverdue(task.due_date) ? 0 : isDueToday(task.due_date) ? 1 : task.priority === 'urgent' ? 2 : task.status === 'waiting' ? 3 : 4)
      const diff = weight(a) - weight(b)
      if (diff !== 0) return diff
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  const visibleMine = mine.slice(0, 5)
  const attention = openTasks
    .filter((task) => task.priority === 'urgent' || isDueToday(task.due_date) || isOverdue(task.due_date))
    .filter((task) => isManagerOrAdmin(profile) || task.assigned_to === profile?.id || task.created_by === profile?.id)
    .slice(0, 3)
  const pinnedNotes = notes.filter((note) => !note.resolved_at && (!note.expires_at || new Date(note.expires_at).getTime() > nowMs)).slice(0, 3)
  const showPendingAlert = isManagerOrAdmin(profile) && pendingProfiles.length > 0

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-heading text-4xl font-semibold text-text md:text-5xl">{getGreeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'}</h1>
          <p className="mt-2 text-muted">Here&apos;s what needs your attention.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button type="button" className="gap-2 shadow-sm shadow-accent/20" onClick={() => navigate('/create')}>
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            New task
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="gap-2 border-accent/25 bg-accent/10 text-accentDark shadow-sm shadow-text/5 hover:border-accent/40 hover:bg-accent/15"
            onClick={() => navigate('/create?type=note')}
          >
            <StickyNote className="h-4 w-4" aria-hidden="true" />
            New note
          </Button>
        </div>
      </section>

      {error ? <p className="rounded-2xl border border-urgent/30 bg-urgent/5 px-4 py-3 text-sm text-urgent">{error}</p> : null}

      {showPendingAlert ? (
        <Card className="flex flex-col justify-between gap-3 border-accent/30 md:flex-row md:items-center">
          <div>
            <p className="font-semibold text-text">{pendingProfiles.length} staff request{pendingProfiles.length === 1 ? '' : 's'} waiting.</p>
            <p className="mt-1 text-sm text-muted">Approve new staff when you have a moment.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => navigate('/team')}>Review</Button>
        </Card>
      ) : null}

      {loading ? (
        <div className="grid gap-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : (
        <div className="space-y-7">
          <Section title={`My tasks (${mine.length})`} href={mine.length > 5 ? '/my-tasks' : undefined} linkLabel="View all">
            {mine.length === 0 ? (
              <p className="rounded-2xl bg-surface px-4 py-4 text-sm text-muted">Nothing assigned to you right now.</p>
            ) : (
              <div className="space-y-2">
                {visibleMine.map((task) => (
                  <TaskCard key={task.id} task={task} variant="compact" categories={categories} onOpen={openTask} onStatusChange={updateTaskStatus} onComplete={completeTask} />
                ))}
              </div>
            )}
          </Section>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
            <Section title="Needs attention" href="/my-tasks" linkLabel="View tasks" secondary>
              {attention.length === 0 ? (
                <p className="rounded-2xl bg-surface px-4 py-4 text-sm text-muted">No other urgent or due-today jobs.</p>
              ) : (
                <div className="space-y-2">
                  {attention.map((task) => (
                    <TaskCard key={task.id} task={task} variant="compact" categories={categories} onOpen={openTask} onStatusChange={updateTaskStatus} onComplete={completeTask} />
                  ))}
                </div>
              )}
            </Section>
            <Section title="Notes" href="/handover" secondary>
              {notesError || pinnedNotes.length === 0 ? (
                <p className="rounded-2xl bg-surface px-4 py-5 text-sm text-muted">No pinned notes today.</p>
              ) : (
                <div className="space-y-3">
                  {pinnedNotes.map((note) => (
                    <Link key={note.id} to={`/handover?note=${note.id}`} className="block rounded-2xl border border-border bg-surface p-4 shadow-sm shadow-text/5 transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex items-start gap-2">
                        {note.pinned ? (
                          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accentDark" aria-label="Pinned note">
                            <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        ) : null}
                        <p className="font-semibold text-text">{note.title}</p>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{note.body || 'Team note'}</p>
                      <p className="mt-3 text-xs font-medium text-muted">
                        {note.created_by_profile?.full_name ?? 'Someone'} - {formatRelativeTime(note.created_at)}
                        {note.expires_at ? ` - Expires ${formatDateTime(note.expires_at)}` : ''}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>
      )}
    </div>
  )
}
