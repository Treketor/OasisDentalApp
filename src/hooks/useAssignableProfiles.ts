import { useCallback, useEffect, useState } from 'react'
import { getAssignableProfiles } from '../lib/tasks'
import type { Profile } from '../types/database'

export function useAssignableProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshProfiles = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setProfiles(await getAssignableProfiles())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignable staff.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshProfiles()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [refreshProfiles])

  return { profiles, loading, error, refreshProfiles }
}
