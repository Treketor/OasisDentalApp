import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  approveProfile as approveProfileService,
  deactivateProfile as deactivateProfileService,
  getProfiles,
  rejectProfile as rejectProfileService,
  updateProfile as updateProfileService,
  type ProfileUpdateInput,
} from '../lib/profiles'
import type { Profile, UserRole } from '../types/database'

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshProfiles = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setProfiles(await getProfiles())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profiles.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshProfiles()
    }, 0)

    const channel = supabase
      .channel('profiles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        void refreshProfiles()
      })
      .subscribe()

    return () => {
      window.clearTimeout(timeoutId)
      void supabase.removeChannel(channel)
    }
  }, [refreshProfiles])

  const replaceProfile = useCallback((profile: Profile) => {
    setProfiles((current) => current.map((item) => (item.id === profile.id ? profile : item)))
  }, [])

  const approveProfile = useCallback(
    async (profileId: string, role: UserRole, location?: string | null) => {
      setError('')
      try {
        const profile = await approveProfileService(profileId, role, location)
        replaceProfile(profile)
        return profile
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to approve profile.'
        setError(message)
        throw new Error(message, { cause: err })
      }
    },
    [replaceProfile],
  )

  const rejectProfile = useCallback(
    async (profileId: string) => {
      setError('')
      try {
        const profile = await rejectProfileService(profileId)
        replaceProfile(profile)
        return profile
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to reject profile.'
        setError(message)
        throw new Error(message, { cause: err })
      }
    },
    [replaceProfile],
  )

  const deactivateProfile = useCallback(
    async (profileId: string) => {
      setError('')
      try {
        const profile = await deactivateProfileService(profileId)
        replaceProfile(profile)
        return profile
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to deactivate profile.'
        setError(message)
        throw new Error(message, { cause: err })
      }
    },
    [replaceProfile],
  )

  const updateProfile = useCallback(
    async (profileId: string, updates: ProfileUpdateInput) => {
      setError('')
      try {
        const profile = await updateProfileService(profileId, updates)
        replaceProfile(profile)
        return profile
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update profile.'
        setError(message)
        throw new Error(message, { cause: err })
      }
    },
    [replaceProfile],
  )

  const pendingProfiles = useMemo(
    () => profiles.filter((profile) => !profile.is_approved && profile.is_active !== false && !profile.rejected_at),
    [profiles],
  )
  const approvedProfiles = useMemo(
    () => profiles.filter((profile) => profile.is_approved && profile.is_active !== false),
    [profiles],
  )

  return {
    profiles,
    pendingProfiles,
    approvedProfiles,
    loading,
    error,
    refreshProfiles,
    approveProfile,
    rejectProfile,
    deactivateProfile,
    updateProfile,
  }
}
