import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useTaskModal } from '../tasks/useTaskModal'
import { searchAll } from '../../lib/search'
import { cn } from '../../lib/cn'
import type { SearchResult, SearchResultsByGroup } from '../../types/search'

const emptyResults: SearchResultsByGroup = { tasks: [], handover: [], profiles: [], templates: [] }

const groups: Array<{ key: keyof Omit<SearchResultsByGroup, 'templates'>; label: string }> = [
  { key: 'tasks', label: 'Tasks' },
  { key: 'handover', label: 'Notes' },
  { key: 'profiles', label: 'Staff' },
]

function allResults(results: SearchResultsByGroup) {
  return groups.flatMap((group) => results[group.key])
}

export function GlobalSearch() {
  const navigate = useNavigate()
  const { openTask } = useTaskModal()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultsByGroup>(emptyResults)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const visibleResults = query.trim().length >= 2 ? results : emptyResults
  const flatResults = useMemo(() => allResults(visibleResults), [visibleResults])
  const groupOffsets = useMemo(() => ({
    tasks: 0,
    handover: visibleResults.tasks.length,
    profiles: visibleResults.tasks.length + visibleResults.handover.length,
  }), [visibleResults])

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!open) return
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      return
    }

    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      setLoading(true)
      searchAll(query)
        .then((nextResults) => {
          if (!cancelled) {
            setResults(nextResults)
            setSelectedIndex(0)
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 200)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [open, query])

  function closeSearch() {
    setOpen(false)
    setQuery('')
    setResults(emptyResults)
  }

  function goToResult(result: SearchResult) {
    if (result.type === 'task') {
      openTask(result.id)
      closeSearch()
      return
    }
    navigate(result.href)
    closeSearch()
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIndex((current) => Math.min(current + 1, Math.max(flatResults.length - 1, 0)))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex((current) => Math.max(current - 1, 0))
    }
    if (event.key === 'Enter' && flatResults[selectedIndex]) {
      event.preventDefault()
      goToResult(flatResults[selectedIndex])
    }
  }

  return (
    <>
      <button
        type="button"
        className="hidden h-10 min-w-56 items-center justify-between rounded-2xl border border-border bg-surface px-3 text-sm text-muted transition hover:border-accent hover:text-text md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <span className="inline-flex items-center gap-2"><Search className="h-4 w-4" /> Search</span>
        <span className="rounded border border-border px-2 py-0.5 text-xs">Ctrl K</span>
      </button>
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface text-sm font-semibold text-text md:hidden"
        aria-label="Open search"
        onClick={() => setOpen(true)}
      >
        <Search className="h-5 w-5" aria-hidden="true" />
      </button>

      {open ? (
        <div className="fixed left-0 top-0 z-[999] flex h-dvh w-screen items-start justify-center bg-background/25 px-3 pt-16 backdrop-blur-md md:px-6 md:pt-[12vh]" role="dialog" aria-modal="true" aria-label="Global search" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeSearch()
        }}>
          <div className="mx-auto flex max-h-[82vh] w-full max-w-[660px] animate-[modalIn_.16s_ease-out] flex-col overflow-hidden rounded-3xl bg-surface/95 shadow-2xl shadow-text/15 ring-1 ring-border/80 backdrop-blur-xl">
            <div className="border-b border-border/70 p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Search tasks, notes, or staff..."
                  className="h-12 min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-muted"
                />
                <button type="button" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-muted transition hover:bg-background hover:text-text" onClick={closeSearch} aria-label="Close search">
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {query.trim().length < 2 ? <p className="rounded-2xl bg-background px-4 py-5 text-sm text-muted">Start typing to search.</p> : null}
              {loading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((item) => <div key={item} className="h-14 animate-pulse rounded-2xl bg-background" />)}
                </div>
              ) : null}
              {!loading && query.trim().length >= 2 && flatResults.length === 0 ? (
                <p className="rounded-2xl bg-background px-4 py-5 text-sm text-muted">No results found.</p>
              ) : null}

              <div className="space-y-5">
                {groups.map((group) => {
                  const items = results[group.key]
                  if (items.length === 0) return null
                  const startIndex = groupOffsets[group.key]

                  return (
                    <section key={group.key}>
                      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</h2>
                      <div className="space-y-1">
                        {items.map((item, index) => {
                          const isSelected = selectedIndex === startIndex + index
                          return (
                            <button
                              key={`${item.type}-${item.id}`}
                              type="button"
                              className={cn(
                                'block w-full rounded-2xl px-4 py-3 text-left transition',
                                isSelected ? 'bg-background shadow-sm' : 'hover:bg-background',
                              )}
                              onClick={() => goToResult(item)}
                            >
                              <p className="font-semibold text-text">{item.title}</p>
                              <p className="mt-1 text-sm text-muted">{item.subtitle}</p>
                            </button>
                          )
                        })}
                      </div>
                    </section>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
