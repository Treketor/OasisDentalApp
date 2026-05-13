import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../components/auth/useAuth'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { useProfiles } from '../hooks/useProfiles'
import { canEditUserRole, canManageUsers } from '../lib/permissions'
import { formatDate, roleLabels } from '../lib/taskLabels'
import type { Profile, UserRole } from '../types/database'
import { cn } from '../lib/cn'

type TeamTab = 'approved' | 'pending' | 'inactive'

const tabs: Array<{ value: TeamTab; label: string }> = [
  { value: 'approved', label: 'Approved staff' },
  { value: 'pending', label: 'Pending approvals' },
  { value: 'inactive', label: 'Inactive / rejected' },
]

const manageableRoles: UserRole[] = ['receptionist', 'nurse', 'dentist', 'manager', 'admin']

function roleBadgeClass(role: UserRole) {
  if (role === 'admin' || role === 'manager') return 'border-accent text-accentDark'
  if (role === 'dentist') return 'border-success text-success'
  return ''
}

function StaffCard({
  profile,
  currentProfile,
  canManage,
  onUpdate,
  onDeactivate,
}: {
  profile: Profile
  currentProfile: Profile | null
  canManage: boolean
  onUpdate: (profileId: string, updates: { role?: UserRole; location?: string | null }) => Promise<unknown>
  onDeactivate: (profileId: string) => Promise<unknown>
}) {
  const [role, setRole] = useState<UserRole>(profile.role)
  const [location, setLocation] = useState(profile.location ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const canEditRole = canManage && canEditUserRole(currentProfile, profile)
  const isSelf = currentProfile?.id === profile.id

  async function saveProfile() {
    setError('')

    if (isSelf && currentProfile && currentProfile.role !== role && (currentProfile.role === 'admin' || currentProfile.role === 'manager')) {
      setError('Use another manager/admin account to change your own elevated role.')
      return
    }

    setSaving(true)
    try {
      await onUpdate(profile.id, {
        role: canEditRole ? role : undefined,
        location: location.trim() || null,
      })
      toast.success('Profile updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update staff profile.')
      toast.error('Profile update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="font-semibold text-text">{profile.full_name}</p>
          <p className="text-sm text-muted">{profile.email}</p>
          <p className="mt-1 text-sm text-muted">{profile.location || 'No location set'}</p>
        </div>
        <Badge className={roleBadgeClass(profile.role)}>{roleLabels[profile.role]}</Badge>
      </div>

      {canManage ? (
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
          <Select value={role} disabled={!canEditRole} onChange={(event) => setRole(event.target.value as UserRole)}>
            {manageableRoles.map((item) => (
              <option key={item} value={item}>{roleLabels[item]}</option>
            ))}
          </Select>
          <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location" />
          <Button type="button" variant="secondary" disabled={saving} onClick={() => void saveProfile()}>
            {saving ? 'Saving' : 'Save'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isSelf}
            onClick={() =>
              void onDeactivate(profile.id)
                .then(() => toast.success('Profile deactivated'))
                .catch(() => toast.error('Deactivation failed'))
            }
          >
            Deactivate
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-urgent">{error}</p> : null}
    </Card>
  )
}

function PendingProfileCard({
  profile,
  onApprove,
  onReject,
}: {
  profile: Profile
  onApprove: (profileId: string, role: UserRole, location: string) => Promise<unknown>
  onReject: (profileId: string) => Promise<unknown>
}) {
  const [role, setRole] = useState<UserRole>(profile.role)
  const [location, setLocation] = useState(profile.location ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function approve() {
    setSaving(true)
    setError('')
    try {
      await onApprove(profile.id, role, location)
      toast.success('Profile approved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve profile.')
      toast.error('Approval failed')
    } finally {
      setSaving(false)
    }
  }

  async function reject() {
    setSaving(true)
    setError('')
    try {
      await onReject(profile.id)
      toast.success('Profile rejected')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject profile.')
      toast.error('Rejection failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="font-semibold text-text">{profile.full_name}</p>
          <p className="text-sm text-muted">{profile.email}</p>
          <p className="mt-1 text-sm text-muted">Requested/current role: {roleLabels[profile.role]}</p>
          <p className="text-sm text-muted">Created: {formatDate(profile.created_at)}</p>
        </div>
        <Badge>Pending</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
        <Select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
          {manageableRoles.map((item) => (
            <option key={item} value={item}>{roleLabels[item]}</option>
          ))}
        </Select>
        <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location" />
        <Button type="button" disabled={saving} onClick={() => void approve()}>
          Approve
        </Button>
        <Button type="button" variant="secondary" disabled={saving} onClick={() => void reject()}>
          Reject
        </Button>
      </div>
      {error ? <p className="text-sm text-urgent">{error}</p> : null}
    </Card>
  )
}

export function TeamPage() {
  const { profile: currentProfile } = useAuth()
  const {
    profiles,
    pendingProfiles,
    approvedProfiles,
    loading,
    error,
    approveProfile,
    rejectProfile,
    deactivateProfile,
    updateProfile,
  } = useProfiles()
  const canManage = canManageUsers(currentProfile)
  const [activeTab, setActiveTab] = useState<TeamTab>('approved')
  const [search, setSearch] = useState('')

  const inactiveProfiles = useMemo(
    () => profiles.filter((profile) => profile.is_active === false || Boolean(profile.rejected_at)),
    [profiles],
  )

  const visibleProfiles = useMemo(() => {
    const source =
      activeTab === 'pending' ? pendingProfiles : activeTab === 'inactive' ? inactiveProfiles : approvedProfiles
    const query = search.trim().toLowerCase()

    if (!query) return source

    return source.filter((profile) =>
      [profile.full_name, profile.email, profile.role, profile.location]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    )
  }, [activeTab, approvedProfiles, inactiveProfiles, pendingProfiles, search])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-heading text-5xl font-bold uppercase text-text">Team</h1>
        <p className="mt-2 text-muted">
          {canManage ? 'Manage staff access, roles, and locations.' : 'Approved Oasis Dental staff available for task assignment.'}
        </p>
      </div>

      {canManage ? (
        <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-surface p-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                activeTab === tab.value ? 'bg-text text-surface' : 'text-muted hover:bg-background hover:text-text',
              )}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
              {tab.value === 'pending' && pendingProfiles.length > 0 ? ` (${pendingProfiles.length})` : ''}
            </button>
          ))}
        </div>
      ) : null}

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name, role, email, or location"
      />

      {error ? <p className="rounded-lg border border-urgent/30 bg-urgent/5 px-4 py-3 text-sm text-urgent">{error}</p> : null}
      {loading ? (
        <div className="grid gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : null}

      {!loading && visibleProfiles.length === 0 ? (
        <EmptyState title="No staff found" message="No profiles match the current view." />
      ) : (
        <div className="grid gap-4">
          {activeTab === 'pending' && canManage
            ? visibleProfiles.map((profile) => (
                <PendingProfileCard
                  key={profile.id}
                  profile={profile}
                  onApprove={approveProfile}
                  onReject={rejectProfile}
                />
              ))
            : visibleProfiles.map((profile) => (
                <StaffCard
                  key={profile.id}
                  profile={profile}
                  currentProfile={currentProfile}
                  canManage={canManage && activeTab === 'approved'}
                  onUpdate={updateProfile}
                  onDeactivate={deactivateProfile}
                />
              ))}
        </div>
      )}
    </div>
  )
}
