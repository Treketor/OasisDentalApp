import type { Profile } from '../types/database'
import type { TaskWithProfiles } from './tasks'
import { defaultWorkspacePermissions, type WorkspacePermissionMap } from './workspaceSettings'

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

function perms(values?: Partial<WorkspacePermissionMap>) {
  return { ...defaultWorkspacePermissions, ...values }
}

export function canEditTaskDetails(profile: Profile | null | undefined, task: TaskWithProfiles | null | undefined, workspacePermissions?: Partial<WorkspacePermissionMap>) {
  if (!profile || !task) return false
  if (isManagerOrAdmin(profile)) return true
  const settings = perms(workspacePermissions)
  if (task.assigned_to === profile.id && settings.staff_can_edit_assigned_task_details) return true
  if (task.created_by === profile.id && settings.staff_can_edit_created_task_after_assignment) return true
  return false
}

export function canUpdateTaskStatus(profile: Profile | null | undefined, task: TaskWithProfiles | null | undefined) {
  if (!profile || !task) return false
  return task.created_by === profile.id || task.assigned_to === profile.id || isManagerOrAdmin(profile)
}

export function canCommentOnTask(profile: Profile | null | undefined, task: TaskWithProfiles | null | undefined) {
  return canUpdateTaskStatus(profile, task)
}

export function canDeleteTask(profile: Profile | null | undefined, task: TaskWithProfiles | null | undefined, workspacePermissions?: Partial<WorkspacePermissionMap>) {
  if (!profile || !task) return false
  if (isManagerOrAdmin(profile)) return true
  return task.created_by === profile.id && perms(workspacePermissions).staff_can_delete_own_tasks
}

export function canSeeTaskQuickActions(profile: Profile | null | undefined, task: TaskWithProfiles | null | undefined) {
  return canUpdateTaskStatus(profile, task)
}

export function canReassignTask(profile: Profile | null | undefined, task: TaskWithProfiles | null | undefined, workspacePermissions?: Partial<WorkspacePermissionMap>) {
  if (!profile || !task) return false
  if (isManagerOrAdmin(profile)) return true
  const settings = perms(workspacePermissions)
  if (task.assigned_to === profile.id && settings.staff_can_reassign_assigned_tasks) return true
  return task.created_by === profile.id && canEditTaskDetails(profile, task, settings)
}

export function canCancelTask(profile: Profile | null | undefined, task: TaskWithProfiles | null | undefined, workspacePermissions?: Partial<WorkspacePermissionMap>) {
  if (!profile || !task) return false
  if (isManagerOrAdmin(profile)) return true
  const settings = perms(workspacePermissions)
  if (task.assigned_to === profile.id && settings.staff_can_cancel_assigned_tasks) return true
  return task.created_by === profile.id && canEditTaskDetails(profile, task, settings)
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
