export type UserRole = 'receptionist' | 'nurse' | 'dentist' | 'manager' | 'admin'

export type TaskStatus = 'new' | 'in_progress' | 'waiting' | 'completed' | 'cancelled'

export type TaskPriority = 'low' | 'normal' | 'urgent'

export type TaskCategory = string

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  location: string | null
  staff_category?: string | null
  is_approved: boolean
  is_active?: boolean
  rejected_at?: string | null
  rejected_by?: string | null
  approved_at?: string | null
  approved_by?: string | null
  created_at: string
  updated_at: string
}

export interface TaskCategorySetting {
  id: string
  name: string
  slug: string
  color: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StaffCategorySetting {
  id: string
  name: string
  slug: string
  color: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorkspacePermission {
  id: string
  key: string
  label: string
  description: string | null
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  patient_reference: string | null
  status: TaskStatus
  priority: TaskPriority
  category: TaskCategory
  created_by: string
  assigned_to: string | null
  location: string | null
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface TaskTemplate {
  id: string
  name: string
  description: string | null
  default_title: string
  default_description: string | null
  default_priority: TaskPriority
  default_category: TaskCategory
  default_location: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SavedTaskView {
  id: string
  user_id: string
  name: string
  filters: Record<string, unknown>
  sort_key: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface HandoverNote {
  id: string
  title: string
  body: string | null
  location: string | null
  shift_date: string
  created_by: string
  pinned: boolean
  expires_at?: string | null
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
  updated_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  body: string
  created_at: string
}

export interface TaskEvent {
  id: string
  task_id: string
  user_id: string | null
  event_type: string
  metadata: Record<string, unknown>
  created_at: string
}

export type NotificationType =
  | 'task_assigned'
  | 'task_reassigned'
  | 'task_status_changed'
  | 'task_completed'
  | 'task_commented'
  | 'task_due_soon'
  | 'task_overdue'
  | 'approval_granted'

export interface Notification {
  id: string
  user_id: string
  task_id: string | null
  actor_id: string | null
  type: NotificationType
  title: string
  body: string | null
  is_read: boolean
  created_at: string
}
