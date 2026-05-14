import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Settings2, X } from 'lucide-react'
import { useAuth } from '../components/auth/useAuth'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { useProfiles } from '../hooks/useProfiles'
import { useStaffCategories } from '../hooks/useStaffCategories'
import { canEditUserRole, canManageUsers } from '../lib/permissions'
import { formatDate, roleLabels } from '../lib/taskLabels'
import { getStaffCategoryName } from '../lib/workspaceSettings'
import type { Profile, UserRole } from '../types/database'
import { cn } from '../lib/cn'

type TeamTab = 'approved' | 'pending' | 'inactive'

const tabs: Array<{ value: TeamTab; label: string }> = [
  { value: 'approved', label: 'Staff' },
  { value: 'pending', label: 'Requests' },
  { value: 'inactive', label: 'Inactive' },
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
  staffCategories,
  onUpdate,
  onDeactivate,
}: {
  profile: Profile
  currentProfile: Profile | null
  canManage: boolean
  staffCategories: ReturnType<typeof useStaffCategories>['data']
  onUpdate: (profileId: string, updates: { role?: UserRole; staff_category?: string | null }) => Promise<unknown>
  onDeactivate: (profileId: string) => Promise<unknown>
}) {
  const [role, setRole] = useState<UserRole>(profile.role)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
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
        <div className="flex items-start gap-3">
          <Avatar name={profile.full_name} id={profile.id} />
          <div>
          <p className="font-semibold text-text">{profile.full_name}</p>
          <p className="text-sm text-muted">{profile.email}</p>
          <p className="mt-1 text-sm text-muted">{getStaffCategoryName(staffCategories, profile.staff_category, profile.role)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={roleBadgeClass(profile.role)}>{roleLabels[profile.role]}</Badge>
          {canManage ? (
            <Button
              type="button"
              variant={manageOpen ? 'secondary' : 'ghost'}
              className="h-10 gap-2 px-3"
              onClick={() => setManageOpen((value) => !value)}
            >
              {manageOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Settings2 className="h-4 w-4" aria-hidden="true" />}
              {manageOpen ? 'Close' : 'Manage'}
            </Button>
          ) : null}
        </div>
      </div>

      {canManage && manageOpen ? (
        <div className="rounded-2xl border border-border bg-background/70 p-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text">Staff access</p>
              <p className="mt-1 text-xs text-muted">Role controls what this person can do in Oasis Tasks.</p>
            </div>
            <button type="button" className="rounded-xl p-2 text-muted transition hover:bg-surface hover:text-text" onClick={() => setManageOpen(false)} aria-label="Close staff options">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Select value={role} disabled={!canEditRole} onChange={(event) => setRole(event.target.value as UserRole)}>
              {manageableRoles.map((item) => (
                <option key={item} value={item}>{roleLabels[item]}</option>
              ))}
            </Select>
            <Button type="button" variant="secondary" disabled={saving} onClick={() => void saveProfile()}>
              {saving ? 'Saving' : 'Save role'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isSelf}
              onClick={() => setConfirmDeactivateOpen(true)}
            >
              Deactivate
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-urgent">{error}</p> : null}
      <ConfirmDialog
        isOpen={confirmDeactivateOpen}
        title="Deactivate staff profile"
        message={`This blocks ${profile.full_name} from Oasis Tasks access until a manager or admin restores access.`}
        confirmLabel="Deactivate"
        loading={saving}
        onCancel={() => setConfirmDeactivateOpen(false)}
        onConfirm={async () => {
          setSaving(true)
          try {
            await onDeactivate(profile.id)
            toast.success('Profile deactivated')
            setConfirmDeactivateOpen(false)
          } catch {
            toast.error('Deactivation failed')
          } finally {
            setSaving(false)
          }
        }}
      />
    </Card>
  )
}

function PendingProfileCard({
  profile,
  onApprove,
  onReject,
}: {
  profile: Profile
  onApprove: (profileId: string, role: UserRole, staffCategory?: string | null) => Promise<unknown>
  onReject: (profileId: string) => Promise<unknown>
}) {
  const [role, setRole] = useState<UserRole>(profile.role)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false)

  async function approve() {
    setSaving(true)
    setError('')
    try {
      await onApprove(profile.id, role)
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
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <Select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
          {manageableRoles.map((item) => (
            <option key={item} value={item}>{roleLabels[item]}</option>
          ))}
        </Select>
        <Button type="button" disabled={saving} onClick={() => void approve()}>
          Approve
        </Button>
        <Button type="button" variant="secondary" disabled={saving} onClick={() => setConfirmRejectOpen(true)}>
          Reject
        </Button>
      </div>
      {error ? <p className="text-sm text-urgent">{error}</p> : null}
      <ConfirmDialog
        isOpen={confirmRejectOpen}
        title="Reject account request"
        message={`This rejects ${profile.full_name}'s access request. They should not register again unless a manager asks them to.`}
        confirmLabel="Reject"
        loading={saving}
        onCancel={() => setConfirmRejectOpen(false)}
        onConfirm={() => void reject().finally(() => setConfirmRejectOpen(false))}
      />
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
  const { data: staffCategories } = useStaffCategories(canManage)
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
      [profile.full_name, profile.email, profile.role]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    )
  }, [activeTab, approvedProfiles, inactiveProfiles, pendingProfiles, search])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-heading text-4xl font-semibold text-text md:text-5xl">Staff</h1>
        <p className="mt-2 text-muted">
          {canManage ? 'Manage staff access and app roles.' : 'Staff directory for Oasis Tasks.'}
        </p>
      </div>

      {canManage ? (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-surface p-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-semibold transition',
                activeTab === tab.value ? 'bg-accent/10 text-accentDark' : 'text-muted hover:bg-background hover:text-text',
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
        placeholder="Search by name, role, or email"
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
                  staffCategories={staffCategories}
                  onUpdate={updateProfile}
                  onDeactivate={deactivateProfile}
                />
              ))}
        </div>
      )}
    </div>
  )
}
