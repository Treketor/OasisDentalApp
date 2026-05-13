import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Button } from '../ui/Button'
import { useAuth } from './useAuth'

function CenteredState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10 text-center">
      <section className="w-full max-w-lg rounded-lg border border-border bg-surface p-8">
        <p className="mb-4 font-heading text-3xl font-bold uppercase text-text">OASIS TASKS</p>
        <h1 className="font-heading text-4xl font-semibold uppercase text-text">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">{message}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </section>
    </main>
  )
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, session, user, profile, signOut, refreshProfile } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <CenteredState
        title="Loading"
        message="Checking your staff session and account access."
      />
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!profile) {
    return (
      <CenteredState
        title="Setting up your account"
        message="Your login is active, but your staff profile is still being created. Refresh shortly or contact a manager if this does not resolve."
        action={
          <Button type="button" variant="secondary" onClick={signOut}>
            Sign out
          </Button>
        }
      />
    )
  }

  if (!profile.is_approved) {
    return (
      <CenteredState
        title="Account pending approval"
        message="Your account has been created, but a manager needs to approve access before you can use Oasis Tasks."
        action={
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-background p-4 text-left text-sm text-muted">
              <p><span className="font-semibold text-text">Name:</span> {profile.full_name}</p>
              <p><span className="font-semibold text-text">Email:</span> {profile.email || user?.email}</p>
              <p><span className="font-semibold text-text">Role:</span> {profile.role}</p>
              {profile.location ? <p><span className="font-semibold text-text">Location:</span> {profile.location}</p> : null}
            </div>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button type="button" variant="secondary" onClick={refreshProfile}>
                Refresh status
              </Button>
              <Button type="button" variant="secondary" onClick={signOut}>
                Sign out
              </Button>
            </div>
          </div>
        }
      />
    )
  }

  return children
}
