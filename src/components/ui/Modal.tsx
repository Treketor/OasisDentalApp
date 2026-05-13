import type { ReactNode } from 'react'
import { Button } from './Button'

interface ModalProps {
  children: ReactNode
  isOpen: boolean
  title: string
  onClose: () => void
}

export function Modal({ children, isOpen, title, onClose }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text/30 px-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-heading text-2xl font-semibold uppercase text-text">{title}</h2>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}
