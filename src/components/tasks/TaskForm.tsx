import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAssignableProfiles } from '../../hooks/useAssignableProfiles'
import { useTaskTemplates } from '../../hooks/useTaskTemplates'
import { createTask } from '../../lib/tasks'
import { categoryLabels, priorityLabels, taskCategories, taskPriorities } from '../../lib/taskLabels'
import type { TaskCategory, TaskPriority, TaskTemplate } from '../../types/database'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { cn } from '../../lib/cn'

const quickTemplateChips: Array<{ label: string; category: TaskCategory; title: string }> = [
  { label: 'Follow-up', category: 'patient_follow_up', title: 'Follow up with patient reference' },
  { label: 'Lab', category: 'lab', title: 'Check lab case status' },
  { label: 'Referral', category: 'referral', title: 'Follow up referral' },
  { label: 'Admin', category: 'admin', title: 'Admin follow-up' },
  { label: 'Clinical', category: 'clinical', title: 'Clinical review required' },
]

export function TaskForm() {
  const navigate = useNavigate()
  const { profiles, loading: profilesLoading, error: profilesError } = useAssignableProfiles()
  const { templates, loading: templatesLoading, error: templatesError } = useTaskTemplates(true)
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
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  function applyTemplate(template: TaskTemplate) {
    setSelectedTemplateId(template.id)
    setTitle(template.default_title)
    setDescription(template.default_description ?? '')
    setPriority(template.default_priority)
    setCategory(template.default_category)
    if (template.default_location) setLocation(template.default_location)
  }

  function applyQuickTemplate(chip: (typeof quickTemplateChips)[number]) {
    setSelectedTemplateId(`quick-${chip.category}`)
    setTitle((current) => current || chip.title)
    setCategory(chip.category)
  }

  function clearTemplate() {
    setSelectedTemplateId('')
  }

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
      setError('Keep patient reference under 24 characters.')
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
      toast.success('Task created')
      navigate('/my-tasks')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task.')
      toast.error('Task creation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <section className="rounded-lg border border-border bg-background p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-text">Start from template</p>
              <p className="mt-1 text-xs leading-5 text-muted">Optional. Selecting one fills the basics, and you can still edit everything.</p>
            </div>
            {selectedTemplateId ? (
              <Button type="button" variant="ghost" className="h-9 px-3" onClick={clearTemplate}>
                Clear template
              </Button>
            ) : null}
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {quickTemplateChips.map((chip) => (
              <button
                key={chip.category}
                type="button"
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                  selectedTemplateId === `quick-${chip.category}`
                    ? 'border-accent bg-accent text-white'
                    : 'border-border bg-surface text-muted hover:border-accent hover:text-text',
                )}
                onClick={() => applyQuickTemplate(chip)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {templates.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {templates.slice(0, 6).map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={cn(
                    'rounded-lg border p-3 text-left transition',
                    selectedTemplateId === template.id
                      ? 'border-accent bg-accent/5'
                      : 'border-border bg-surface hover:border-accent',
                  )}
                  onClick={() => applyTemplate(template)}
                >
                  <span className="block text-sm font-semibold text-text">{template.name}</span>
                  <span className="mt-1 block text-xs text-muted">{categoryLabels[template.default_category]}</span>
                </button>
              ))}
            </div>
          ) : null}

          {!templatesLoading && templatesError ? (
            <p className="mt-3 text-xs leading-5 text-muted">Templates are unavailable, but manual task creation still works.</p>
          ) : null}
        </section>

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
            maxLength={24}
          />
          <p className="mt-2 text-xs leading-5 text-muted">
            Use initials or an internal reference only. Do not enter full patient names or medical details. {patientReference.length}/24
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
