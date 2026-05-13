export type TaskStatus = 'new' | 'in_progress' | 'waiting' | 'completed' | 'cancelled'

export type TaskPriority = 'low' | 'normal' | 'urgent'

export type ClinicRole = 'Reception' | 'Nurse' | 'Dentist' | 'Manager'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignee: string
  role: ClinicRole
  dueDate: string
  createdBy: string
}
