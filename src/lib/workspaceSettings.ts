import { categoryLabels, roleLabels, taskCategories } from './taskLabels'
import type { StaffCategorySetting, TaskCategorySetting, TaskCategory, UserRole, WorkspacePermission } from '../types/database'

export const fallbackTaskCategories: TaskCategorySetting[] = taskCategories.map((slug, index) => ({
  id: slug,
  slug,
  name: categoryLabels[slug],
  color: null,
  icon: null,
  sort_order: (index + 1) * 10,
  is_active: true,
  created_at: '',
  updated_at: '',
}))

const fallbackStaffCategoryData: Array<{ slug: string; name: string; role?: UserRole }> = [
  { slug: 'reception', name: 'Reception', role: 'receptionist' },
  { slug: 'nurse', name: 'Nurse', role: 'nurse' },
  { slug: 'dentist', name: 'Dentist', role: 'dentist' },
  { slug: 'manager', name: 'Manager', role: 'manager' },
  { slug: 'admin', name: 'Admin', role: 'admin' },
  { slug: 'other', name: 'Other' },
]

export const fallbackStaffCategories: StaffCategorySetting[] = fallbackStaffCategoryData.map((item, index) => ({
  id: item.slug,
  slug: item.slug,
  name: item.name,
  color: null,
  icon: null,
  sort_order: (index + 1) * 10,
  is_active: true,
  created_at: '',
  updated_at: '',
}))

export const defaultWorkspacePermissions = {
  staff_can_edit_assigned_task_details: false,
  staff_can_edit_created_task_after_assignment: true,
  staff_can_delete_own_tasks: false,
  staff_can_reassign_assigned_tasks: false,
  staff_can_cancel_assigned_tasks: true,
  staff_can_edit_own_notes: true,
  staff_can_delete_own_notes: false,
  staff_can_resolve_any_note: true,
  staff_can_edit_own_display_name: true,
  staff_can_choose_staff_category: false,
} as const

export type WorkspacePermissionKey = keyof typeof defaultWorkspacePermissions
export type WorkspacePermissionMap = Record<WorkspacePermissionKey, boolean>

export const fallbackWorkspacePermissions: WorkspacePermission[] = Object.entries(defaultWorkspacePermissions).map(([key, enabled]) => ({
  id: key,
  key,
  label: key.replaceAll('_', ' '),
  description: null,
  enabled,
  created_at: '',
  updated_at: '',
}))

export function toPermissionMap(permissions: WorkspacePermission[]): WorkspacePermissionMap {
  return {
    ...defaultWorkspacePermissions,
    ...Object.fromEntries(permissions.map((permission) => [permission.key, permission.enabled])),
  } as WorkspacePermissionMap
}

export function isMissingSettingsTable(message: string) {
  return message.includes('does not exist') || message.includes('schema cache') || message.includes('staff_category')
}

export function getTaskCategoryName(categories: TaskCategorySetting[], value: string) {
  return categories.find((category) => category.slug === value)?.name ?? categoryLabels[value as TaskCategory] ?? value
}

export function getStaffCategoryName(categories: StaffCategorySetting[], staffCategory: string | null | undefined, role: UserRole) {
  if (staffCategory) {
    const match = categories.find((category) => category.slug === staffCategory)
    if (match) return match.name
  }
  return roleLabels[role]
}

export function roleFromStaffCategory(slug: string): UserRole {
  if (slug === 'nurse') return 'nurse'
  if (slug === 'dentist') return 'dentist'
  return 'receptionist'
}
