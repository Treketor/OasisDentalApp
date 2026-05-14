import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Flag, Info, Tag, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { TaskCategoryPicker } from './TaskCategoryPicker'
import { useTaskModal } from './useTaskModal'
import { useAssignableProfiles } from '../../hooks/useAssignableProfiles'
import { createTask } from '../../lib/tasks'
import { priorityLabels, taskPriorities } from '../../lib/taskLabels'
import type { TaskCategory, TaskPriority } from '../../types/database'
import { Button } from '../ui/Button'
import { DateTimePicker } from '../ui/DateTimePicker'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
export function TaskForm() {
  const navigate = useNavigate()
  const { openTask } = useTaskModal()
  const { profiles, loading: profilesLoading, error: profilesError } = useAssignableProfiles()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [patientReference, setPatientReference] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [category, setCategory] = useState<TaskCategory>('other')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showMoreOptions, setShowMoreOptions] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (title.trim().length < 3) {
      setError('Add a clear task title.')
      toast.error('Task title is required')
      return
    }
    if (patientReference.trim().length > 24) {
      setError('Keep reference/context under 24 characters.')
      return
    }

    setLoading(true)

    try {
      const task = await createTask({
        title: title.trim(),
        description: description.trim() || null,
        patient_reference: patientReference,
        assigned_to: assignedTo || null,
        priority,
        category,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      })
      setSuccess('Task created.')
      toast.success('Task created')
      navigate('/')
      window.setTimeout(() => openTask(task), 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task.')
      toast.error('Task creation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-3xl border border-border/80 bg-surface p-5 shadow-xl shadow-text/5 sm:p-6">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <Input className="h-14 text-lg font-semibold" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs doing?" />
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add details, optional"
          className="min-h-28"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-text">
            <span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-muted" /> Assign to</span>
            <Select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>
              <option value="">Unassigned</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-2 text-sm font-semibold text-text">
            <span className="flex items-center gap-2"><Tag className="h-4 w-4 text-muted" /> Category</span>
            <TaskCategoryPicker value={category} onChange={(value) => setCategory(value as TaskCategory)} />
          </label>
          <label className="space-y-2 text-sm font-semibold text-text">
            <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted" /> Due date</span>
            <DateTimePicker value={dueDate || null} onChange={(value) => setDueDate(value ?? '')} />
          </label>
          <label className="space-y-2 text-sm font-semibold text-text">
            <span className="flex items-center gap-2"><Flag className="h-4 w-4 text-muted" /> Priority</span>
            <Select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
              {taskPriorities.map((item) => (
                <option key={item} value={item}>
                  {priorityLabels[item]} priority
                </option>
              ))}
            </Select>
          </label>
        </div>

        <button type="button" className="text-sm font-semibold text-accentDark hover:text-accent" onClick={() => setShowMoreOptions((value) => !value)}>
          {showMoreOptions ? 'Hide more options' : 'More options'}
        </button>

        {showMoreOptions ? (
        <div>
          <label className="space-y-2 text-sm font-semibold text-text">
            <span className="flex items-center gap-2"><Info className="h-4 w-4 text-muted" /> Reference / context</span>
            <Input
              value={patientReference}
              onChange={(event) => setPatientReference(event.target.value)}
              placeholder="Reference / context"
              maxLength={24}
            />
            <p className="mt-2 text-xs leading-5 text-muted">
              Use initials or a short reference only. Do not add private medical details. {patientReference.length}/24
            </p>
          </label>
        </div>
        ) : null}

        {profilesError ? <p className="text-sm text-urgent">{profilesError}</p> : null}
        {error ? <p className="rounded-lg border border-urgent/30 bg-urgent/5 px-4 py-3 text-sm text-urgent">{error}</p> : null}
        {success ? <p className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">{success}</p> : null}

        <div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={loading || profilesLoading}>
            {loading ? 'Creating' : 'Create task'}
          </Button>
        </div>
      </form>
    </div>
  )
}
