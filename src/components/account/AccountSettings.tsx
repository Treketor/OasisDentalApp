import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../auth/useAuth'
import { StaffCategoryPicker } from '../staff/StaffCategoryPicker'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { useStaffCategories } from '../../hooks/useStaffCategories'
import { useWorkspacePermissions } from '../../hooks/useWorkspacePermissions'
import { isManagerOrAdmin } from '../../lib/permissions'
import { supabase } from '../../lib/supabase'
import { updateProfile } from '../../lib/profiles'
import { getStaffCategoryName } from '../../lib/workspaceSettings'
import { roleLabels } from '../../lib/taskLabels'

export function AccountSettings() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const { data: staffCategories } = useStaffCategories()
  const { values: permissions } = useWorkspacePermissions()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [staffCategory, setStaffCategory] = useState(profile?.staff_category ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  if (!profile) return null

  const canEditName = isManagerOrAdmin(profile) || permissions.staff_can_edit_own_display_name
  const canChooseCategory = isManagerOrAdmin(profile) || permissions.staff_can_choose_staff_category

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    if (fullName.trim().length < 2) {
      toast.error('Add your display name')
      return
    }
    setSavingProfile(true)
    try {
      await updateProfile(profile.id, {
        full_name: canEditName ? fullName.trim() : undefined,
        staff_category: canChooseCategory ? staffCategory || null : undefined,
      })
      await refreshProfile()
      toast.success('Account updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Account could not be updated')
    } finally {
      setSavingProfile(false)
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setPassword('')
      setConfirmPassword('')
      toast.success('Password updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Password could not be updated. Sign in again and retry.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <Card className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-text">Account</h2>
        <p className="mt-1 text-sm text-muted">Your Oasis Tasks profile and sign-in settings.</p>
      </div>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={saveProfile}>
        <Input value={user?.email ?? profile.email} disabled placeholder="Email" />
        <Input value={fullName} disabled={!canEditName} onChange={(event) => setFullName(event.target.value)} placeholder="Display name" />
        <StaffCategoryPicker
          value={staffCategory}
          disabled={!canChooseCategory}
          allLabel={getStaffCategoryName(staffCategories, profile.staff_category, profile.role)}
          fallbackRole={profile.role}
          onChange={setStaffCategory}
        />
        <Input value={roleLabels[profile.role]} disabled placeholder="System role" />
        <div className="flex flex-wrap gap-3 md:col-span-2">
          <Button type="submit" disabled={savingProfile || (!canEditName && !canChooseCategory)}>{savingProfile ? 'Saving' : 'Save account'}</Button>
          <Button type="button" variant="secondary" onClick={signOut}>Sign out</Button>
        </div>
      </form>

      <form className="grid gap-3 border-t border-border pt-5 md:grid-cols-2" onSubmit={changePassword}>
        <div className="md:col-span-2">
          <h3 className="font-semibold text-text">Change password</h3>
          <p className="mt-1 text-sm text-muted">Use at least 8 characters.</p>
        </div>
        <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" autoComplete="new-password" />
        <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" autoComplete="new-password" />
        <div className="md:col-span-2">
          <Button type="submit" variant="secondary" disabled={savingPassword}>{savingPassword ? 'Updating' : 'Update password'}</Button>
        </div>
      </form>
    </Card>
  )
}
