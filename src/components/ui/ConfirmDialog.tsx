import { Button } from './Button'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  loading?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-text/30 px-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl">
        <h2 id="confirm-title" className="font-heading text-3xl font-semibold uppercase text-text">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-muted">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={loading} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading}
            className="border-urgent bg-urgent text-white hover:border-urgent hover:bg-urgent"
            onClick={onConfirm}
          >
            {loading ? 'Working' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
