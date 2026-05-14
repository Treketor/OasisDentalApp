import { supabase } from './supabase'
import { defaultWorkspacePermissions, fallbackWorkspacePermissions, isMissingSettingsTable, toPermissionMap, type WorkspacePermissionKey } from './workspaceSettings'
import type { WorkspacePermission } from '../types/database'

function permissionError(message: string) {
  if (isMissingSettingsTable(message)) return 'Workspace permissions are using defaults until workspace settings migration is run.'
  if (message.toLowerCase().includes('row-level security')) return 'Only managers and admins can update permissions.'
  return 'Workspace permissions could not be saved.'
}

export async function getWorkspacePermissions() {
  const { data, error } = await supabase.from('workspace_permissions').select('*').order('key')
  if (error) {
    if (isMissingSettingsTable(error.message)) return fallbackWorkspacePermissions
    throw new Error(permissionError(error.message))
  }
  return (data ?? []) as WorkspacePermission[]
}

export async function updateWorkspacePermission(key: WorkspacePermissionKey, enabled: boolean) {
  const { data, error } = await supabase
    .from('workspace_permissions')
    .update({ enabled })
    .eq('key', key)
    .select('*')
    .single()
  if (error) throw new Error(permissionError(error.message))
  return data as WorkspacePermission
}

export function getPermissionValue(permissions: WorkspacePermission[], key: WorkspacePermissionKey, fallback = defaultWorkspacePermissions[key]) {
  return toPermissionMap(permissions)[key] ?? fallback
}
