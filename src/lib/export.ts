import type { HandoverNoteWithProfile } from './handover'
import type { TaskWithProfiles } from './tasks'

function csvValue(value: unknown) {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}

function toCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((row) => row.map(csvValue).join(',')).join('\n')
}

export function exportTasksToCsv(tasks: TaskWithProfiles[]) {
  return toCsv(
    [
      'id',
      'title',
      'status',
      'priority',
      'category',
      'reference_context',
      'assigned_to',
      'created_by',
      'due_date',
      'completed_at',
      'created_at',
      'updated_at',
    ],
    tasks.map((task) => [
      task.id,
      task.title,
      task.status,
      task.priority,
      task.category,
      task.patient_reference,
      task.assigned_to_profile?.full_name ?? '',
      task.created_by_profile?.full_name ?? '',
      task.due_date,
      task.completed_at,
      task.created_at,
      task.updated_at,
    ]),
  )
}

export function exportHandoverNotesToCsv(notes: HandoverNoteWithProfile[]) {
  return toCsv(
    ['id', 'title', 'body', 'pinned', 'expires_at', 'resolved_at', 'created_by', 'created_at'],
    notes.map((note) => [
      note.id,
      note.title,
      note.body,
      note.pinned,
      note.expires_at ?? '',
      note.resolved_at,
      note.created_by_profile?.full_name ?? '',
      note.created_at,
    ]),
  )
}

export function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function exportDateStamp() {
  return new Date().toISOString().slice(0, 10)
}
