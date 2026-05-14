import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../auth/useAuth'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Skeleton } from '../ui/Skeleton'
import { useStaffCategories } from '../../hooks/useStaffCategories'
import { cn } from '../../lib/cn'
import { isManagerOrAdmin } from '../../lib/permissions'
import { getStaffCategoryName } from '../../lib/workspaceSettings'
import type { UserRole } from '../../types/database'

interface StaffCategoryPickerProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  allLabel?: string
  fallbackRole?: UserRole
  allowCreate?: boolean
  className?: string
}

export function StaffCategoryPicker({
  value,
  onChange,
  disabled = false,
  allLabel,
  fallbackRole = 'receptionist',
  allowCreate = true,
  className,
}: StaffCategoryPickerProps) {
  const { profile } = useAuth()
  const { data: categories, loading, create } = useStaffCategories()
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const canCreate = allowCreate && isManagerOrAdmin(profile)
  const selectedLabel = value ? getStaffCategoryName(categories, value, fallbackRole) : allLabel ?? 'Choose staff category'

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  async function addCategory() {
    const trimmed = newName.trim()
    if (trimmed.length < 2) return
    setSaving(true)
    try {
      const category = await create({ name: trimmed, sort_order: (categories.length + 1) * 10 })
      onChange(category.slug)
      setNewName('')
      setOpen(false)
      toast.success('Staff category added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Staff category could not be added')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left text-sm font-semibold text-text outline-none transition hover:border-accent focus:border-accent focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <UsersRound className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <span className="truncate">{selectedLabel}</span>
        </span>
        <span className="text-xs text-muted">{open ? 'Close' : 'Change'}</span>
      </button>

      {open ? createPortal(
        <div
          data-oasis-floating-layer="true"
          className="fixed inset-0 z-[1000] flex items-start justify-center bg-background/20 px-3 pt-16 backdrop-blur-sm md:pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Choose staff category"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
        <div className="w-[min(420px,calc(100vw-2rem))] animate-[modalIn_.16s_ease-out] overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl shadow-text/15">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-text">Choose staff category</p>
          </div>
          <div className="max-h-[55vh] overflow-y-auto p-2">
            {loading ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : null}
            {allLabel ? (
              <button
                type="button"
                className={cn(
                  'flex min-h-12 w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-background',
                  value === '' ? 'bg-accent/10 text-accentDark' : 'text-text',
                )}
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
              >
                {allLabel}
              </button>
            ) : null}
            {categories.map((category) => (
              <button
                key={category.slug}
                type="button"
                className={cn(
                  'flex min-h-12 w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition hover:bg-background',
                  value === category.slug ? 'bg-accent/10 text-accentDark' : 'text-text',
                )}
                onClick={() => {
                  onChange(category.slug)
                  setOpen(false)
                }}
              >
                <span>{category.name}</span>
                {value === category.slug ? <span className="text-xs text-accentDark">Selected</span> : null}
              </button>
            ))}
          </div>

          {canCreate ? (
            <div className="border-t border-border bg-background/60 p-3">
              <p className="mb-2 text-xs font-semibold text-muted">Add staff category</p>
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Category name"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void addCategory()
                    }
                  }}
                />
                <Button type="button" className="h-11 gap-2 px-4" disabled={saving || newName.trim().length < 2} onClick={() => void addCategory()}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add
                </Button>
              </div>
            </div>
          ) : null}
        </div>
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
