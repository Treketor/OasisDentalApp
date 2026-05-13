import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-5xl font-bold uppercase text-text">Settings</h1>
        <p className="mt-2 text-muted">Clinic preferences and account controls will live here.</p>
      </div>
      <Card>
        <h2 className="font-heading text-3xl font-semibold uppercase text-text">Notifications</h2>
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
    </div>
  )
}
