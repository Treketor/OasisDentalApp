import type { Profile } from '../types/database'

export function isAdmin(profile: Profile | null | undefined) {
  return profile?.role === 'admin'
}

export function isManager(profile: Profile | null | undefined) {
  return profile?.role === 'manager'
}

export function isManagerOrAdmin(profile: Profile | null | undefined) {
  return isManager(profile) || isAdmin(profile)
}

export function canManageUsers(profile: Profile | null | undefined) {
  return isManagerOrAdmin(profile)
}

export function canDeleteTasks(profile: Profile | null | undefined) {
  return isManagerOrAdmin(profile)
}

export function canApproveUsers(profile: Profile | null | undefined) {
  return isManagerOrAdmin(profile)
}

export function canEditUserRole(profile: Profile | null | undefined, targetProfile: Profile | null | undefined) {
  if (!profile || !targetProfile) return false
  if (profile.role === 'admin') return true
  if (profile.role !== 'manager') return false
  return targetProfile.role !== 'admin'
}
