import { toast } from 'sonner'
import { Card } from '../ui/Card'
import { Switch } from '../ui/Switch'
import { useWorkspacePermissions } from '../../hooks/useWorkspacePermissions'
import type { WorkspacePermissionKey } from '../../lib/workspaceSettings'

const groups: Array<{ title: string; keys: WorkspacePermissionKey[] }> = [
  {
    title: 'Tasks',
    keys: [
      'staff_can_edit_assigned_task_details',
      'staff_can_edit_created_task_after_assignment',
      'staff_can_delete_own_tasks',
      'staff_can_reassign_assigned_tasks',
      'staff_can_cancel_assigned_tasks',
    ],
  },
  {
    title: 'Notes',
    keys: ['staff_can_edit_own_notes', 'staff_can_delete_own_notes', 'staff_can_resolve_any_note'],
  },
  {
    title: 'Account',
    keys: ['staff_can_edit_own_display_name', 'staff_can_choose_staff_category'],
  },
]

export function PermissionSettings() {
  const { data, values, loading, error, update } = useWorkspacePermissions()
  const byKey = Object.fromEntries(data.map((permission) => [permission.key, permission]))

  return (
    <Card>
      <h2 className="font-heading text-2xl font-semibold text-text">Permissions</h2>
      <p className="mt-1 text-sm text-muted">These settings control what non-manager staff can do.</p>
      {error ? <p className="mt-3 text-sm text-warning">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-muted">Loading permissions...</p> : null}
      <div className="mt-5 space-y-5">
        {groups.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2 text-sm font-semibold text-text">{group.title}</h3>
            <div className="divide-y divide-border rounded-2xl border border-border">
              {group.keys.map((key) => {
                const permission = byKey[key]
                return (
                  <div key={key} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="font-semibold text-text">{permission?.label ?? key.replaceAll('_', ' ')}</p>
                      {permission?.description ? <p className="mt-1 text-sm text-muted">{permission.description}</p> : null}
                    </div>
                    <Switch
                      checked={values[key]}
                      label={permission?.label ?? key}
                      onChange={(enabled) => {
                        void update(key, enabled)
                          .then(() => toast.success('Permission updated'))
                          .catch((err) => toast.error(err instanceof Error ? err.message : 'Permission update failed'))
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </Card>
  )
}
