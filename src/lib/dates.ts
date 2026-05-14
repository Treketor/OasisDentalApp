export function isDueToday(value: string | null) {
  if (!value) return false
  const date = new Date(value)
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

export function isOverdue(value: string | null) {
  if (!value) return false
  const date = new Date(value)
  const now = new Date()
  return date.getTime() < now.getTime() && !isDueToday(value)
}

export function isDueSoon(value: string | null) {
  if (!value || isOverdue(value)) return false
  const date = new Date(value).getTime()
  const now = Date.now()
  const nextDay = now + 24 * 60 * 60 * 1000
  return date >= now && date <= nextDay
}

export function formatDueDate(value: string | null) {
  if (!value) return 'No date'
  const date = new Date(value)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (isOverdue(value)) return 'Overdue'
  if (isDueToday(value)) return 'Due today'
  if (isDueSoon(value)) return 'Due soon'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  const diffDays = Math.ceil((date.getTime() - today.getTime()) / 86400000)
  if (diffDays > 1 && diffDays <= 7) return `Due in ${diffDays} days`

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatRelativeTime(value: string | null) {
  if (!value) return ''
  const diffMs = new Date(value).getTime() - Date.now()
  const absMs = Math.abs(diffMs)
  const minutes = Math.round(absMs / 60000)
  const hours = Math.round(absMs / 3600000)
  const days = Math.round(absMs / 86400000)
  const suffix = diffMs < 0 ? 'ago' : 'from now'

  if (minutes < 60) return `${minutes || 1}m ${suffix}`
  if (hours < 24) return `${hours}h ${suffix}`
  return `${days}d ${suffix}`
}

export function startOfWeek(date = new Date()) {
  const result = new Date(date)
  const day = result.getDay()
  result.setDate(result.getDate() - day)
  result.setHours(0, 0, 0, 0)
  return result
}

export function endOfWeek(date = new Date()) {
  const result = startOfWeek(date)
  result.setDate(result.getDate() + 6)
  result.setHours(23, 59, 59, 999)
  return result
}

export function isThisWeek(value: string | null) {
  if (!value) return false
  const date = new Date(value).getTime()
  return date >= startOfWeek().getTime() && date <= endOfWeek().getTime()
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 22) return 'Good evening'
  return 'Good night'
}
