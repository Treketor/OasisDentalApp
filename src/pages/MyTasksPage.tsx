import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { TaskDetailPanel } from '../components/tasks/TaskDetailPanel'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { PriorityPill } from '../components/ui/PriorityPill'
import { Select } from '../components/ui/Select'
import { TaskListSkeleton } from '../components/ui/Skeleton'
import { StatusPill } from '../components/ui/StatusPill'
import { useAuth } from '../components/auth/useAuth'
import { useAssignableProfiles } from '../hooks/useAssignableProfiles'
import { useTasks } from '../hooks/useTasks'
import {
  categoryLabels,
  formatDate,
  priorityLabels,
  statusLabels,
  taskCategories,
  taskPriorities,
  taskStatuses,
} from '../lib/taskLabels'
import { formatDueDate, isDueToday, isOverdue, isThisWeek } from '../lib/dates'
import type { TaskWithProfiles } from '../lib/tasks'
import type { TaskCategory, TaskPriority, TaskStatus } from '../types/database'
import { cn } from '../lib/cn'

type Tab = 'assigned' | 'created' | 'open' | 'completed'
type SortMode = 'priority' | 'due_date' | 'newest'
type QuickFilter = 'due_today' | 'overdue' | 'urgent' | 'waiting' | 'unassigned' | 'completed_week'

const tabs: Array<{ value: Tab; label: string }> = [
  { value: 'assigned', label: 'Assigned to me' },
  { value: 'created', label: 'Created by me' },
  { value: 'open', label: 'All open' },
  { value: 'completed', label: 'Completed' },
]

const quickFilters: Array<{ value: QuickFilter; label: string }> = [
  { value: 'due_today', label: 'Due today' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'completed_week', label: 'Completed this week' },
]

function priorityWeight(priority: TaskPriority) {
  return priority === 'urgent' ? 0 : priority === 'normal' ? 1 : 2
}

export function MyTasksPage() {
  const [searchParams] = useSearchParams()
  const { profile } = useAuth()
  const { profiles } = useAssignableProfiles()
  const { tasks, loading, error, updateTask, updateTaskStatus, completeTask, deleteTask } = useTasks()
  const [activeTab, setActiveTab] = useState<Tab>('assigned')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TaskStatus | ''>('')
  const [priority, setPriority] = useState<TaskPriority | ''>('')
  const [category, setCategory] = useState<TaskCategory | ''>('')
  const [assignee, setAssignee] = useState('')
  const [sort, setSort] = useState<SortMode>('priority')
  const [quickFilter, setQuickFilter] = useState<QuickFilter | ''>('')
  const [selectedTask, setSelectedTask] = useState<TaskWithProfiles | null>(null)

  useEffect(() => {
    const taskId = searchParams.get('task')
    if (!taskId || tasks.length === 0) return
    const task = tasks.find((item) => item.id === taskId)
    if (task) {
      window.setTimeout(() => setSelectedTask(task), 0)
    }
  }, [searchParams, tasks])

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    const currentUserId = profile?.id

    return tasks
      .filter((task) => {
        if (activeTab === 'assigned' && task.assigned_to !== currentUserId) return false
        if (activeTab === 'created' && task.created_by !== currentUserId) return false
        if (activeTab === 'open' && ['completed', 'cancelled'].includes(task.status)) return false
        if (activeTab === 'completed' && task.status !== 'completed') return false
        if (status && task.status !== status) return false
        if (priority && task.priority !== priority) return false
        if (category && task.category !== category) return false
        if (assignee && task.assigned_to !== assignee) return false
        if (quickFilter === 'due_today' && !isDueToday(task.due_date)) return false
        if (quickFilter === 'overdue' && !isOverdue(task.due_date)) return false
        if (quickFilter === 'urgent' && task.priority !== 'urgent') return false
        if (quickFilter === 'waiting' && task.status !== 'waiting') return false
        if (quickFilter === 'unassigned' && task.assigned_to) return false
        if (quickFilter === 'completed_week' && !(task.status === 'completed' && isThisWeek(task.completed_at))) return false
        if (!query) return true

        return [task.title, task.description, task.patient_reference]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query))
      })
      .sort((a, b) => {
        if (sort === 'priority') return priorityWeight(a.priority) - priorityWeight(b.priority)
        if (sort === 'due_date') {
          if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          if (a.due_date) return -1
          if (b.due_date) return 1
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [activeTab, assignee, category, priority, profile?.id, quickFilter, search, sort, status, tasks])

  const selectedLiveTask = selectedTask ? tasks.find((task) => task.id === selectedTask.id) ?? selectedTask : null

  async function runQuickAction(taskId: string, nextStatus: TaskStatus) {
    try {
      if (nextStatus === 'completed') {
        await completeTask(taskId)
        toast.success('Task completed')
      } else {
        await updateTaskStatus(taskId, nextStatus)
        toast.success('Task updated')
      }
    } catch {
      toast.error('Task update failed')
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-heading text-5xl font-bold uppercase text-text">My Tasks</h1>
        <p className="mt-2 text-muted">Assigned work, created tasks, and open clinic handover items.</p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-surface p-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              activeTab === tab.value ? 'bg-text text-surface' : 'text-muted hover:bg-background hover:text-text',
            )}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="grid gap-3 rounded-lg border border-border bg-surface p-4 md:grid-cols-2 xl:grid-cols-6">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" className="xl:col-span-2" />
        <Select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus | '')}>
          <option value="">All statuses</option>
          {taskStatuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
        </Select>
        <Select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority | '')}>
          <option value="">All priorities</option>
          {taskPriorities.map((item) => <option key={item} value={item}>{priorityLabels[item]}</option>)}
        </Select>
        <Select value={category} onChange={(event) => setCategory(event.target.value as TaskCategory | '')}>
          <option value="">All categories</option>
          {taskCategories.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}
        </Select>
        <Select value={assignee} onChange={(event) => setAssignee(event.target.value)}>
          <option value="">All assignees</option>
          {profiles.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}
        </Select>
        <Select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
          <option value="priority">Sort by priority</option>
          <option value="due_date">Sort by due date</option>
          <option value="newest">Sort by newest</option>
        </Select>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {quickFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition',
              quickFilter === filter.value
                ? 'border-accent bg-accent text-white'
                : 'border-border bg-surface text-muted hover:border-accent hover:text-text',
            )}
            onClick={() => setQuickFilter((current) => (current === filter.value ? '' : filter.value))}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error ? <p className="rounded-lg border border-urgent/30 bg-urgent/5 px-4 py-3 text-sm text-urgent">{error}</p> : null}
      {loading ? <TaskListSkeleton /> : null}

      {!loading && filteredTasks.length === 0 ? (
        <EmptyState title="No matching tasks" message="Adjust filters or create a new handover task." />
      ) : !loading ? (
        <div className="divide-y divide-border rounded-lg border border-border bg-surface">
          {filteredTasks.map((task) => (
            <article
              key={task.id}
              className={cn(
                'grid w-full gap-4 px-5 py-4 text-left transition hover:bg-background lg:grid-cols-[1fr_140px_140px_120px]',
                task.status === 'completed' ? 'opacity-60' : '',
                task.status === 'waiting' ? 'bg-warning/5' : '',
                isOverdue(task.due_date) && task.status !== 'completed' ? 'border-l-2 border-l-urgent' : '',
              )}
            >
              <button type="button" className="text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" onClick={() => setSelectedTask(task)}>
                <div className="mb-2 flex flex-wrap gap-2">
                  <PriorityPill priority={task.priority} />
                  <StatusPill status={task.status} />
                  <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted">
                    {categoryLabels[task.category]}
                  </span>
                </div>
                <h3 className="font-semibold text-text">{task.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{task.description || 'No description'}</p>
                {task.patient_reference ? <p className="mt-2 text-xs font-semibold text-accentDark">Ref: {task.patient_reference}</p> : null}
              </button>
              <div className="text-sm text-muted">
                <span className="lg:hidden">Assigned: </span>{task.assigned_to_profile?.full_name ?? 'Unassigned'}
              </div>
              <div className="text-sm text-muted">
                <span className="lg:hidden">Due: </span>
                <span className={isOverdue(task.due_date) && task.status !== 'completed' ? 'font-semibold text-urgent' : ''}>
                  {formatDueDate(task.due_date)}
                </span>
              </div>
              <div className="text-sm text-muted">
                <span className="lg:hidden">Created: </span>{formatDate(task.created_at)}
              </div>
              <div className="flex flex-wrap gap-2 lg:col-span-4">
                {['new', 'waiting'].includes(task.status) ? (
                  <button type="button" className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:border-accent hover:text-text" onClick={() => void runQuickAction(task.id, 'in_progress')}>
                    Start
                  </button>
                ) : null}
                {!['completed', 'cancelled'].includes(task.status) ? (
                  <>
                    <button type="button" className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:border-warning hover:text-warning" onClick={() => void runQuickAction(task.id, 'waiting')}>
                      Wait
                    </button>
                    <button type="button" className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:border-success hover:text-success" onClick={() => void runQuickAction(task.id, 'completed')}>
                      Complete
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {selectedLiveTask ? (
        <TaskDetailPanel
          key={`${selectedLiveTask.id}-${selectedLiveTask.updated_at}`}
          task={selectedLiveTask}
          profiles={profiles}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
          onStatusChange={updateTaskStatus}
          onComplete={completeTask}
          onDelete={deleteTask}
        />
      ) : null}
    </div>
  )
}
