import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'
import { roleLabels } from '../../lib/taskLabels'
import { NotificationBell } from '../notifications/NotificationBell'

const navItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'My Tasks', to: '/my-tasks' },
  { label: 'Create', to: '/create' },
  { label: 'Team', to: '/team' },
  { label: 'Settings', to: '/settings' },
]

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-full px-4 py-2 text-sm font-semibold transition',
    isActive ? 'bg-text text-surface' : 'text-muted hover:bg-surface hover:text-text',
  )

export function AppShell() {
  const { profile, signOut } = useAuth()
  const [accountOpen, setAccountOpen] = useState(false)
  const showNavigation = profile?.is_approved === true

  return (
    <div className="min-h-screen bg-background text-text">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-20 items-center justify-between px-5 md:px-8 lg:px-10">
          <NavLink to="/" className="font-heading text-3xl font-bold uppercase text-text">
            OASIS TASKS
          </NavLink>
          <div className="flex items-center gap-3">
            {profile ? (
              <>
                <div className="hidden text-right md:block">
                  <p className="text-sm font-semibold text-text">{profile.full_name}</p>
                  <p className="text-xs text-muted">{profile.location || 'Oasis Dental'}</p>
                </div>
                <Badge className="hidden md:inline-flex">{roleLabels[profile.role]}</Badge>
              </>
            ) : null}
            {showNavigation ? <NotificationBell /> : null}
            {profile ? (
              <div className="relative md:hidden">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold text-text"
                  aria-label="Account menu"
                  onClick={() => setAccountOpen((value) => !value)}
                >
                  {profile.full_name.slice(0, 1)}
                </button>
                {accountOpen ? (
                  <div className="absolute right-0 top-14 z-50 w-56 rounded-lg border border-border bg-surface p-4 shadow-xl">
                    <p className="text-sm font-semibold text-text">{profile.full_name}</p>
                    <p className="mt-1 text-xs text-muted">{roleLabels[profile.role]}</p>
                    <Button type="button" variant="secondary" className="mt-4 w-full" onClick={signOut}>
                      Sign out
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <Button type="button" variant="secondary" className="hidden md:inline-flex" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-[240px_1fr]">
        {showNavigation ? (
        <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] border-r border-border px-5 py-8 lg:block">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        ) : null}

        <main className="min-h-[calc(100vh-5rem)] px-5 py-6 pb-28 md:px-8 md:py-10 lg:px-10 lg:pb-10">
          <Outlet />
        </main>
      </div>

      {showNavigation ? (
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface px-2 py-2 lg:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'rounded-full px-2 py-3 text-center text-xs font-semibold transition',
                isActive ? 'bg-text text-surface' : 'text-muted',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      ) : null}
    </div>
  )
}
