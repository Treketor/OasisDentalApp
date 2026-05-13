import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useAuth } from '../components/auth/useAuth'
import { EmptyState } from '../components/ui/EmptyState'
import { Card } from '../components/ui/Card'
import { PriorityPill } from '../components/ui/PriorityPill'
import { StatusPill } from '../components/ui/StatusPill'
import { useTasks } from '../hooks/useTasks'
import { useProfiles } from '../hooks/useProfiles'
import { isManagerOrAdmin } from '../lib/permissions'
import { isDueToday, isOverdue, isThisWeek, formatDueDate } from '../lib/dates'
import type { TaskWithProfiles } from '../lib/tasks'

function TaskSection({ title, tasks }: { title: string; tasks: TaskWithProfiles[] }) {
  return (
    <section>
      <h2 className="mb-4 font-heading text-3xl font-semibold uppercase text-text">{title}</h2>
      {tasks.length === 0 ? (
        <EmptyState title="No tasks" message="Nothing to show in this section right now." />
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-surface">
          {tasks.map((task) => (
            <article
              key={task.id}
              className={`grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center ${
                task.status === 'completed' ? 'opacity-60' : ''
              }`}
            >
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <PriorityPill priority={task.priority} />
                  <StatusPill status={task.status} />
                </div>
                <h3 className="font-semibold text-text">{task.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{task.description || 'No description'}</p>
              </div>
              <div className="text-sm text-muted md:text-right">
                <p className="font-semibold text-text">{task.assigned_to_profile?.full_name ?? 'Unassigned'}</p>
                <p className={isOverdue(task.due_date) && task.status !== 'completed' ? 'font-semibold text-urgent' : ''}>
                  {formatDueDate(task.due_date)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export function DashboardPage() {
  const { profile } = useAuth()
  const { tasks, loading, error } = useTasks()
  const { pendingProfiles } = useProfiles()
  const showPendingAlert = isManagerOrAdmin(profile) && pendingProfiles.length > 0

  const openTasks = tasks.filter((task) => task.status !== 'completed' && task.status !== 'cancelled')
  const summary = useMemo(
    () => [
      { label: 'Assigned to me', value: openTasks.filter((task) => task.assigned_to === profile?.id).length },
      { label: 'Urgent', value: openTasks.filter((task) => task.priority === 'urgent').length },
      { label: 'Due today', value: openTasks.filter((task) => isDueToday(task.due_date)).length },
      { label: 'Waiting', value: openTasks.filter((task) => task.status === 'waiting').length },
      { label: 'Completed this week', value: tasks.filter((task) => task.status === 'completed' && isThisWeek(task.completed_at)).length },
    ],
    [openTasks, profile?.id, tasks],
  )

  const recentTasks = [...tasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
  const urgentTasks = openTasks.filter((task) => task.priority === 'urgent').slice(0, 5)
  const dueTodayTasks = openTasks.filter((task) => isDueToday(task.due_date)).slice(0, 5)
  const overdueTasks = openTasks.filter((task) => isOverdue(task.due_date)).slice(0, 5)
  const recentlyCompleted = tasks
    .filter((task) => task.status === 'completed')
    .sort((a, b) => new Date(b.completed_at ?? b.updated_at).getTime() - new Date(a.completed_at ?? a.updated_at).getTime())
    .slice(0, 5)

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="flex flex-col justify-between gap-5 border-b border-border pb-8 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-accentDark">Clinic handover</p>
          <h1 className="font-heading text-5xl font-bold uppercase leading-none text-text md:text-7xl">
            Good afternoon, {profile?.full_name?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
            A calm view of the clinic tasks that need attention before the next shift.
          </p>
        </div>
        <Link
          to="/create"
          className="inline-flex h-11 w-full items-center justify-center rounded-full border border-accent bg-accent px-5 text-sm font-semibold text-white transition hover:border-accentDark hover:bg-accentDark md:w-auto"
        >
          Create task
        </Link>
      </section>

      {error ? <p className="rounded-lg border border-urgent/30 bg-urgent/5 px-4 py-3 text-sm text-urgent">{error}</p> : null}
      {loading ? <p className="text-sm text-muted">Loading tasks...</p> : null}

      {showPendingAlert ? (
        <Card className="flex flex-col justify-between gap-4 border-accent/40 bg-surface md:flex-row md:items-center">
          <div>
            <p className="font-semibold text-text">
              {pendingProfiles.length} staff {pendingProfiles.length === 1 ? 'account is' : 'accounts are'} waiting for approval.
            </p>
            <p className="mt-1 text-sm text-muted">Review new staff access before they can use Oasis Tasks.</p>
          </div>
          <Link
            to="/team"
            className="inline-flex h-10 items-center justify-center rounded-full border border-accent bg-accent px-4 text-sm font-semibold text-white transition hover:border-accentDark hover:bg-accentDark"
          >
            Review team
          </Link>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summary.map((item) => (
          <Card key={item.label} className="p-5">
            <p className="text-sm font-medium text-muted">{item.label}</p>
            <p className="mt-4 font-heading text-5xl font-semibold leading-none text-text">{item.value}</p>
          </Card>
        ))}
      </section>

      {!loading && tasks.length === 0 ? (
        <EmptyState title="No tasks yet" message="Create the first handover task for the clinic team." />
      ) : (
        <div className="grid gap-8 xl:grid-cols-3">
          <TaskSection title={isManagerOrAdmin(profile) ? 'Overdue across team' : 'My due today'} tasks={isManagerOrAdmin(profile) ? overdueTasks : dueTodayTasks.filter((task) => task.assigned_to === profile?.id)} />
          <TaskSection title="Due today" tasks={dueTodayTasks} />
          <TaskSection title="Overdue" tasks={overdueTasks} />
          <TaskSection title={isManagerOrAdmin(profile) ? 'Urgent tasks' : 'My urgent tasks'} tasks={isManagerOrAdmin(profile) ? urgentTasks : urgentTasks.filter((task) => task.assigned_to === profile?.id)} />
          <TaskSection title="Recently completed" tasks={recentlyCompleted} />
          <TaskSection title="Recently created" tasks={recentTasks} />
        </div>
      )}
    </div>
  )
}
