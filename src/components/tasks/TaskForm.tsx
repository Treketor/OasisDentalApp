import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAssignableProfiles } from '../../hooks/useAssignableProfiles'
import { createTask } from '../../lib/tasks'
import { categoryLabels, priorityLabels, taskCategories, taskPriorities } from '../../lib/taskLabels'
import type { TaskCategory, TaskPriority } from '../../types/database'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'

export function TaskForm() {
  const navigate = useNavigate()
  const { profiles, loading: profilesLoading, error: profilesError } = useAssignableProfiles()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [patientReference, setPatientReference] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [category, setCategory] = useState<TaskCategory>('other')
  const [dueDate, setDueDate] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (title.trim().length < 3) {
      setError('Add a clear task title.')
      return
    }

    setLoading(true)

    try {
      await createTask({
        title,
        description,
        patient_reference: patientReference,
        assigned_to: assignedTo || null,
        priority,
        category,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        location,
      })
      setSuccess('Task created.')
      navigate('/my-tasks')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Task title" />
        </div>
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Details or handover notes"
        />
        <div>
          <Input
            value={patientReference}
            onChange={(event) => setPatientReference(event.target.value)}
            placeholder="Patient reference, optional"
          />
          <p className="mt-2 text-xs leading-5 text-muted">
            Use initials or an internal reference only. Do not enter full patient names or medical details.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>
            <option value="">Assign to</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.full_name} - {profile.role}
              </option>
            ))}
          </Select>
          <Select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
            {taskPriorities.map((item) => (
              <option key={item} value={item}>
                {priorityLabels[item]} priority
              </option>
            ))}
          </Select>
          <Select value={category} onChange={(event) => setCategory(event.target.value as TaskCategory)}>
            {taskCategories.map((item) => (
              <option key={item} value={item}>
                {categoryLabels[item]}
              </option>
            ))}
          </Select>
          <Input value={dueDate} onChange={(event) => setDueDate(event.target.value)} type="datetime-local" />
          <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location" />
        </div>

        {profilesError ? <p className="text-sm text-urgent">{profilesError}</p> : null}
        {error ? <p className="rounded-lg border border-urgent/30 bg-urgent/5 px-4 py-3 text-sm text-urgent">{error}</p> : null}
        {success ? <p className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">{success}</p> : null}

        <Button type="submit" disabled={loading || profilesLoading}>
          {loading ? 'Creating' : 'Create task'}
        </Button>
      </form>
    </Card>
  )
}
