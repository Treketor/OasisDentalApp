import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../components/auth/useAuth'
import { AccountSettings } from '../components/account/AccountSettings'
import { PermissionSettings } from '../components/manage/PermissionSettings'
import { StaffCategoryManager } from '../components/manage/StaffCategoryManager'
import { TaskCategoryManager } from '../components/manage/TaskCategoryManager'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useHandoverNotes } from '../hooks/useHandoverNotes'
import { useTasks } from '../hooks/useTasks'
import { downloadCsv, exportDateStamp, exportHandoverNotesToCsv, exportTasksToCsv } from '../lib/export'
import { getSystemChecklist, type HealthCheckResult } from '../lib/health'
import { isManagerOrAdmin } from '../lib/permissions'

function DataExportSection() {
  const { profile } = useAuth()
  const { tasks, loading: tasksLoading } = useTasks()
  const { data: handoverNotes, loading: handoverLoading } = useHandoverNotes({ includeResolved: true })

  if (!isManagerOrAdmin(profile)) return null

  return (
    <Card>
      <h2 className="font-heading text-2xl font-semibold text-text">Exports</h2>
      <p className="mt-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-muted">
        Exports may contain internal task references. Do not share exported files outside approved clinic systems.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={tasksLoading}
          onClick={() => downloadCsv(`oasis-tasks-${exportDateStamp()}.csv`, exportTasksToCsv(tasks))}
        >
          Export visible tasks CSV
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={handoverLoading}
          onClick={() => downloadCsv(`oasis-handover-${exportDateStamp()}.csv`, exportHandoverNotesToCsv(handoverNotes))}
        >
          Export handover notes CSV
        </Button>
      </div>
    </Card>
  )
}

function statusClass(status: HealthCheckResult['status']) {
  if (status === 'available') return 'border-success text-success'
  if (status === 'missing') return 'border-urgent text-urgent'
  return 'border-warning text-warning'
}

function SystemChecklist() {
  const { profile } = useAuth()
  const [checks, setChecks] = useState<HealthCheckResult[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setChecks(await getSystemChecklist(profile))
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [refresh])

  if (!isManagerOrAdmin(profile)) return null

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-text">System checklist</h2>
          <p className="mt-1 text-sm text-muted">Lightweight deployment checks. Secret values are never shown.</p>
        </div>
        <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => {
          setOpen((value) => !value)
          if (!open) void refresh()
        }}>
          {open ? 'Hide' : 'Show'}
        </Button>
      </div>
      {open ? <div className="mt-5 grid gap-3 md:grid-cols-2">
        {loading ? <p className="text-sm text-muted">Checking system status...</p> : null}
        {checks.map((check) => (
          <div key={check.label} className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-text">{check.label}</p>
              <Badge className={statusClass(check.status)}>
                {check.status === 'available' ? 'Available' : check.status === 'missing' ? 'Missing' : 'Unknown'}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{check.detail}</p>
          </div>
        ))}
      </div> : null}
    </Card>
  )
}

export function SettingsPage() {
  const { profile } = useAuth()
  const canManage = isManagerOrAdmin(profile)
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-4xl font-semibold text-text md:text-5xl">Manage</h1>
        <p className="mt-2 text-muted">Simple controls for the workspace.</p>
      </div>
      <AccountSettings />
      <Card>
        <h2 className="font-heading text-2xl font-semibold text-text">Notifications</h2>
        <div className="mt-5 divide-y divide-border">
          <div className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-semibold text-text">In-app notifications</p>
              <p className="text-sm text-muted">Task assignments, comments, approvals, and status updates.</p>
            </div>
            <Badge className="border-success text-success">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-semibold text-text">Email notifications</p>
              <p className="text-sm text-muted">Optional staff email alerts.</p>
            </div>
            <Badge>Coming later</Badge>
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-semibold text-text">Push notifications</p>
              <p className="text-sm text-muted">Device notifications for time-sensitive tasks.</p>
            </div>
            <Badge>Coming later</Badge>
          </div>
        </div>
      </Card>
      {canManage ? (
        <>
          <div>
            <h2 className="font-heading text-3xl font-semibold text-text">Workspace settings</h2>
            <p className="mt-1 text-sm text-muted">Quiet admin controls for how Oasis Tasks behaves.</p>
          </div>
          <TaskCategoryManager />
          <StaffCategoryManager />
          <PermissionSettings />
          <DataExportSection />
          <SystemChecklist />
        </>
      ) : null}
    </div>
  )
}
