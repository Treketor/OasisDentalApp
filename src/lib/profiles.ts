import { supabase } from './supabase'
import type { Profile, UserRole } from '../types/database'
import { createApprovalGrantedNotification } from './notifications'

export interface ProfileUpdateInput {
  full_name?: string
  role?: UserRole
  location?: string | null
  is_approved?: boolean
  is_active?: boolean
  rejected_at?: string | null
  rejected_by?: string | null
  approved_at?: string | null
  approved_by?: string | null
}

function getFriendlyProfileError(message: string) {
  if (message.includes('is_active') || message.includes('approved_at') || message.includes('rejected_at')) {
    return 'Profile management fields are missing. Run supabase/profile-management-migration.sql in Supabase.'
  }

  if (message.toLowerCase().includes('row-level security')) {
    return 'You do not have permission to manage this profile. Manager or admin access is required.'
  }

  return message
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('You must be signed in to manage profiles.')
  }

  return user.id
}

export async function getProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(getFriendlyProfileError(error.message))
  }

  return (data ?? []) as Profile[]
}

export async function getApprovedProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_approved', true)
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (error) {
    throw new Error(getFriendlyProfileError(error.message))
  }

  return (data ?? []) as Profile[]
}

export async function getPendingProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_approved', false)
    .eq('is_active', true)
    .is('rejected_at', null)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(getFriendlyProfileError(error.message))
  }

  return (data ?? []) as Profile[]
}

export async function getProfileById(profileId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (error) {
    throw new Error(getFriendlyProfileError(error.message))
  }

  return data as Profile
}

export async function updateProfile(profileId: string, updates: ProfileUpdateInput) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .select('*')
    .single()

  if (error) {
    throw new Error(getFriendlyProfileError(error.message))
  }

  return data as Profile
}

export async function approveProfile(profileId: string, role: UserRole, location?: string | null) {
  const userId = await getCurrentUserId()

  const profile = await updateProfile(profileId, {
    role,
    location: location?.trim() || null,
    is_approved: true,
    is_active: true,
    approved_at: new Date().toISOString(),
    approved_by: userId,
    rejected_at: null,
    rejected_by: null,
  })

  void createApprovalGrantedNotification(profileId)
  return profile
}

export async function rejectProfile(profileId: string) {
  const userId = await getCurrentUserId()

  return updateProfile(profileId, {
    is_approved: false,
    is_active: false,
    rejected_at: new Date().toISOString(),
    rejected_by: userId,
  })
}

export async function deactivateProfile(profileId: string) {
  return updateProfile(profileId, {
    is_active: false,
    is_approved: false,
  })
}
