import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../components/auth/useAuth'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { useTaskTemplates } from '../hooks/useTaskTemplates'
import { isManagerOrAdmin } from '../lib/permissions'
import { categoryLabels, priorityLabels, taskCategories, taskPriorities } from '../lib/taskLabels'
import type { TaskCategory, TaskPriority, TaskTemplate } from '../types/database'

const emptyTemplateForm = {
  name: '',
  default_title: '',
  default_description: '',
  default_priority: 'normal' as TaskPriority,
  default_category: 'other' as TaskCategory,
  default_location: '',
  is_active: true,
}

export function SettingsPage() {
  const { profile } = useAuth()
  const canManageTemplates = isManagerOrAdmin(profile)
  const { templates, loading, error, createTaskTemplate, updateTaskTemplate, deactivateTaskTemplate } = useTaskTemplates(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null)
  const [form, setForm] = useState(emptyTemplateForm)

  function closeTemplateModal() {
    setModalOpen(false)
    setEditingTemplate(null)
    setForm(emptyTemplateForm)
  }

  function openEdit(template: TaskTemplate) {
    setEditingTemplate(template)
    setForm({
      name: template.name,
      default_title: template.default_title,
      default_description: template.default_description ?? '',
      default_priority: template.default_priority,
      default_category: template.default_category,
      default_location: template.default_location ?? '',
      is_active: template.is_active,
    })
    setModalOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim() || !form.default_title.trim()) {
      toast.error('Template name and title are required')
      return
    }

    try {
      if (editingTemplate) {
        await updateTaskTemplate(editingTemplate.id, form)
        toast.success('Template updated')
      } else {
        await createTaskTemplate(form)
        toast.success('Template created')
      }
      closeTemplateModal()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Template could not be saved')
    }
  }

  async function handleDeactivate(template: TaskTemplate) {
    try {
      await deactivateTaskTemplate(template.id)
      toast.success('Template deactivated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Template could not be deactivated')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-5xl font-bold uppercase text-text">Settings</h1>
        <p className="mt-2 text-muted">Clinic preferences and account controls will live here.</p>
      </div>
      <Card>
        <h2 className="font-heading text-3xl font-semibold uppercase text-text">Notifications</h2>
        <div className="mt-5 divide-y divide-border">
          <div className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-semibold text-text">In-app notifications</p>
              <p className="text-sm text-muted">Task assignments, comments, approvals, and status updates.</p>
            </div>
            <Badge className="border-success text-success">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-semibold text-text">Email notifications</p>
              <p className="text-sm text-muted">Optional staff email alerts.</p>
            </div>
            <Badge>Coming later</Badge>
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-semibold text-text">Push notifications</p>
              <p className="text-sm text-muted">Device notifications for time-sensitive tasks.</p>
            </div>
            <Badge>Coming later</Badge>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="font-heading text-3xl font-semibold uppercase text-text">Task Templates</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Reusable, privacy-safe starting points for common clinic work.
            </p>
          </div>
          {canManageTemplates ? (
            <Button type="button" onClick={() => setModalOpen(true)}>
              New template
            </Button>
          ) : null}
        </div>

        {error ? <p className="mt-4 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-muted">{error}</p> : null}
        {loading ? <p className="mt-4 text-sm text-muted">Loading templates...</p> : null}

        {!loading ? (
          <div className="mt-5 divide-y divide-border">
            {templates.length === 0 ? (
              <p className="py-4 text-sm text-muted">No task templates are available yet.</p>
            ) : (
              templates.map((template) => (
                <div key={template.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-text">{template.name}</p>
                      <Badge className={template.is_active ? 'border-success text-success' : ''}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge>{categoryLabels[template.default_category]}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">{template.default_title}</p>
                  </div>
                  {canManageTemplates ? (
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => openEdit(template)}>
                        Edit
                      </Button>
                      {template.is_active ? (
                        <Button type="button" variant="ghost" className="h-9 px-3" onClick={() => void handleDeactivate(template)}>
                          Deactivate
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        ) : null}
      </Card>

      <Modal
        isOpen={modalOpen}
        title={editingTemplate ? 'Edit Template' : 'New Template'}
          onClose={closeTemplateModal}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Template name" />
          <Input value={form.default_title} onChange={(event) => setForm((current) => ({ ...current, default_title: event.target.value }))} placeholder="Default task title" />
          <Textarea
            value={form.default_description}
            onChange={(event) => setForm((current) => ({ ...current, default_description: event.target.value }))}
            placeholder="Default description"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              value={form.default_priority}
              onChange={(event) => setForm((current) => ({ ...current, default_priority: event.target.value as TaskPriority }))}
            >
              {taskPriorities.map((priority) => (
                <option key={priority} value={priority}>{priorityLabels[priority]} priority</option>
              ))}
            </Select>
            <Select
              value={form.default_category}
              onChange={(event) => setForm((current) => ({ ...current, default_category: event.target.value as TaskCategory }))}
            >
              {taskCategories.map((category) => (
                <option key={category} value={category}>{categoryLabels[category]}</option>
              ))}
            </Select>
            <Input value={form.default_location} onChange={(event) => setForm((current) => ({ ...current, default_location: event.target.value }))} placeholder="Default location" />
            <label className="flex h-11 items-center gap-3 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-text">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
              />
              Active
            </label>
          </div>
          <p className="text-xs leading-5 text-muted">
            Keep template text generic. Do not include full patient names, diagnosis details, or treatment notes.
          </p>
          <Button type="submit">{editingTemplate ? 'Save template' : 'Create template'}</Button>
        </form>
      </Modal>
    </div>
  )
}
