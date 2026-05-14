import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Input } from '../ui/Input'
import { useTaskCategories } from '../../hooks/useTaskCategories'
import type { TaskCategorySetting } from '../../types/database'

export function TaskCategoryManager() {
  const { data, loading, error, create, update, deactivate, remove, reorder } = useTaskCategories(true)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TaskCategorySetting | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim().length < 2) return
    setSaving(true)
    try {
      await create({ name, sort_order: (data.length + 1) * 10 })
      setName('')
      toast.success('Category added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Category could not be added')
    } finally {
      setSaving(false)
    }
  }

  async function rename(id: string, nextName: string) {
    try {
      await update(id, { name: nextName })
      toast.success('Category updated')
    } catch {
      toast.error('Category could not be updated')
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...data]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    await reorder(next.map((category) => category.id))
  }

  async function deleteCategory() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await remove(deleteTarget.id)
      toast.success('Category deleted')
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Category could not be deleted')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <h2 className="font-heading text-2xl font-semibold text-text">Task categories</h2>
      <p className="mt-1 text-sm text-muted">Categories appear in new tasks and filters. Deactivating or deleting one does not change old tasks.</p>
      <form className="mt-4 flex gap-2" onSubmit={add}>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Add category" />
        <Button type="submit" disabled={saving}>Add</Button>
      </form>
      {error ? <p className="mt-3 text-sm text-warning">{error}</p> : null}
      <div className="mt-4 divide-y divide-border rounded-2xl border border-border">
        {loading ? <p className="p-4 text-sm text-muted">Loading categories...</p> : null}
        {data.map((category, index) => (
          <div key={category.id} className="grid gap-3 p-3 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex items-center gap-2">
              <Input defaultValue={category.name} onBlur={(event) => {
                if (event.target.value.trim() && event.target.value !== category.name) void rename(category.id, event.target.value)
              }} />
              {!category.is_active ? <Badge>Inactive</Badge> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => void move(index, -1)}>Up</Button>
              <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => void move(index, 1)}>Down</Button>
              {category.slug !== 'other' && category.is_active ? <Button type="button" variant="ghost" className="h-9 px-3" onClick={() => void deactivate(category.id)}>Deactivate</Button> : null}
              {category.slug !== 'other' ? (
                <Button type="button" variant="ghost" className="h-9 px-3 text-urgent hover:text-urgent" onClick={() => setDeleteTarget(category)}>
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete category?"
        message={`Delete "${deleteTarget?.name ?? 'this category'}" from the category list. Existing tasks keep their saved category text, but this category will no longer be available for new tasks.`}
        confirmLabel="Delete"
        loading={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={() => void deleteCategory()}
      />
    </Card>
  )
}
