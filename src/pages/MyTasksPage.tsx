import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { TaskCard } from '../components/tasks/TaskCard'
import { TaskCategoryPicker } from '../components/tasks/TaskCategoryPicker'
import { useTaskModal } from '../components/tasks/useTaskModal'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { TaskListSkeleton } from '../components/ui/Skeleton'
import { useAuth } from '../components/auth/useAuth'
import { useAssignableProfiles } from '../hooks/useAssignableProfiles'
import { useTaskCategories } from '../hooks/useTaskCategories'
import { useTasks } from '../hooks/useTasks'
import { cn } from '../lib/cn'
import { isDueToday, isOverdue } from '../lib/dates'
import { isManagerOrAdmin } from '../lib/permissions'
import { priorityLabels, statusLabels, taskPriorities, taskStatuses } from '../lib/taskLabels'
import type { TaskCategory, TaskPriority, TaskStatus } from '../types/database'

type Tab = 'mine' | 'team' | 'created' | 'done'
type SortMode = 'attention' | 'due_date' | 'newest'
type DueFilter = '' | 'overdue' | 'due_today' | 'no_date'

const tabs: Array<{ value: Tab; label: string }> = [
  { value: 'mine', label: 'Mine' },
  { value: 'team', label: 'Team' },
  { value: 'created', label: 'Created' },
  { value: 'done', label: 'Done' },
]

function attentionWeight(task: { due_date: string | null; priority: TaskPriority }) {
  if (isOverdue(task.due_date)) return 0
  if (isDueToday(task.due_date)) return 1
  if (task.priority === 'urgent') return 2
  return 3
}

function emptyMessage(tab: Tab) {
  if (tab === 'mine') return 'No tasks assigned to you.'
  if (tab === 'team') return 'No open team tasks.'
  if (tab === 'created') return 'You have not created any tasks.'
  return 'No completed tasks yet.'
}

export function MyTasksPage() {
  const navigate = useNavigate()
  const { openTask } = useTaskModal()
  const { profile } = useAuth()
  const { profiles } = useAssignableProfiles()
  const { data: categories } = useTaskCategories()
  const { tasks, loading, error, updateTaskStatus, completeTask } = useTasks()
  const [activeTab, setActiveTab] = useState<Tab>('mine')
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [status, setStatus] = useState<TaskStatus | ''>('')
  const [priority, setPriority] = useState<TaskPriority | ''>('')
  const [category, setCategory] = useState<TaskCategory | ''>('')
  const [assignee, setAssignee] = useState('')
  const [dueFilter, setDueFilter] = useState<DueFilter>('')
  const [sort, setSort] = useState<SortMode>('attention')

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    const currentUserId = profile?.id
    const manager = isManagerOrAdmin(profile)

    return tasks
      .filter((task) => {
        if (activeTab === 'mine' && task.assigned_to !== currentUserId) return false
        if (activeTab === 'team' && ['completed', 'cancelled'].includes(task.status)) return false
        if (activeTab === 'team' && !manager && task.assigned_to !== currentUserId && task.created_by !== currentUserId) return false
        if (activeTab === 'created' && task.created_by !== currentUserId) return false
        if (activeTab === 'done' && !['completed', 'cancelled'].includes(task.status)) return false
        if (activeTab !== 'done' && ['completed', 'cancelled'].includes(task.status)) return false
        if (status && task.status !== status) return false
        if (priority && task.priority !== priority) return false
        if (category && task.category !== category) return false
        if (assignee && task.assigned_to !== assignee) return false
        if (dueFilter === 'overdue' && !isOverdue(task.due_date)) return false
        if (dueFilter === 'due_today' && !isDueToday(task.due_date)) return false
        if (dueFilter === 'no_date' && task.due_date) return false
        if (!query) return true
        return [task.title, task.description, task.patient_reference]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query))
      })
      .sort((a, b) => {
        if (sort === 'attention') {
          const diff = attentionWeight(a) - attentionWeight(b)
          if (diff !== 0) return diff
        }
        if (sort === 'due_date') {
          if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          if (a.due_date) return -1
          if (b.due_date) return 1
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [activeTab, assignee, category, dueFilter, priority, profile, search, sort, status, tasks])

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-heading text-4xl font-semibold text-text md:text-5xl">Tasks</h1>
          <p className="mt-2 text-muted">Your tasks and team jobs in one place.</p>
        </div>
        <Button type="button" onClick={() => navigate('/create')}>New task</Button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-surface p-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-semibold transition',
              activeTab === tab.value ? 'bg-accent/10 text-accentDark' : 'text-muted hover:bg-background hover:text-text',
            )}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_180px]">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" />
        <Button type="button" variant="secondary" className="gap-2" onClick={() => setFiltersOpen((value) => !value)}>
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </Button>
        <Select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
          <option value="attention">Sort by attention</option>
          <option value="due_date">Sort by due date</option>
          <option value="newest">Sort by newest</option>
        </Select>
      </div>

      {filtersOpen ? (
        <section className="grid gap-3 rounded-2xl border border-border bg-surface p-4 md:grid-cols-2 xl:grid-cols-5">
          <Select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus | '')}>
            <option value="">All statuses</option>
            {taskStatuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
          </Select>
          <Select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority | '')}>
            <option value="">All priorities</option>
            {taskPriorities.map((item) => <option key={item} value={item}>{priorityLabels[item]}</option>)}
          </Select>
          <TaskCategoryPicker value={category} allLabel="All categories" allowCreate={false} onChange={(value) => setCategory(value as TaskCategory | '')} />
          <Select value={assignee} onChange={(event) => setAssignee(event.target.value)}>
            <option value="">All assignees</option>
            {profiles.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}
          </Select>
          <Select value={dueFilter} onChange={(event) => setDueFilter(event.target.value as DueFilter)}>
            <option value="">Any due date</option>
            <option value="overdue">Overdue</option>
            <option value="due_today">Due today</option>
            <option value="no_date">No date</option>
          </Select>
        </section>
      ) : null}

      {error ? <p className="rounded-2xl border border-urgent/30 bg-urgent/5 px-4 py-3 text-sm text-urgent">{error}</p> : null}
      {loading ? <TaskListSkeleton /> : null}

      {!loading && filteredTasks.length === 0 ? (
        <EmptyState title="No tasks" message={search || status || priority || category || assignee || dueFilter ? 'Try another search or filter.' : emptyMessage(activeTab)} />
      ) : !loading ? (
        <div className="grid gap-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              categories={categories}
              onOpen={openTask}
              onStatusChange={updateTaskStatus}
              onComplete={completeTask}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
