import { useEffect, type RefObject } from 'react'

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onOutside: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return undefined

    function handlePointerDown(event: MouseEvent) {
      const target = event.target
      if (target instanceof Element && target.closest('[data-oasis-floating-layer="true"]')) return
      if (!ref.current?.contains(target as Node)) onOutside()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onOutside()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, onOutside, ref])
}
