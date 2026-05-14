import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Input } from '../ui/Input'
import { useStaffCategories } from '../../hooks/useStaffCategories'
import type { StaffCategorySetting } from '../../types/database'

export function StaffCategoryManager() {
  const { data, loading, error, create, update, deactivate, remove } = useStaffCategories(true)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StaffCategorySetting | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim().length < 2) return
    setSaving(true)
    try {
      await create({ name, sort_order: (data.length + 1) * 10 })
      setName('')
      toast.success('Staff category added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Staff category could not be added')
    } finally {
      setSaving(false)
    }
  }

  async function deleteCategory() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await remove(deleteTarget.id)
      toast.success('Staff category deleted')
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Staff category could not be deleted')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <h2 className="font-heading text-2xl font-semibold text-text">Staff categories</h2>
      <p className="mt-1 text-sm text-muted">System role controls permissions. Staff category is just the label shown in the app.</p>
      <form className="mt-4 flex gap-2" onSubmit={add}>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Add staff category" />
        <Button type="submit" disabled={saving}>Add</Button>
      </form>
      {error ? <p className="mt-3 text-sm text-warning">{error}</p> : null}
      <div className="mt-4 divide-y divide-border rounded-2xl border border-border">
        {loading ? <p className="p-4 text-sm text-muted">Loading staff categories...</p> : null}
        {data.map((category) => (
          <div key={category.id} className="grid gap-3 p-3 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex items-center gap-2">
              <Input defaultValue={category.name} onBlur={(event) => {
                if (event.target.value.trim() && event.target.value !== category.name) {
                  void update(category.id, { name: event.target.value }).then(() => toast.success('Staff category updated')).catch(() => toast.error('Staff category could not be updated'))
                }
              }} />
              {!category.is_active ? <Badge>Inactive</Badge> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {category.is_active ? <Button type="button" variant="ghost" className="h-9 px-3" onClick={() => void deactivate(category.id)}>Deactivate</Button> : null}
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
        title="Delete staff category?"
        message={`Delete "${deleteTarget?.name ?? 'this category'}" from the staff category list. Existing staff profiles keep their saved category text until changed.`}
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
