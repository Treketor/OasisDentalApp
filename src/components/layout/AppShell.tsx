import { NavLink, Outlet } from 'react-router-dom'
import { useRef, useState } from 'react'
import { Home, ListChecks, PlusCircle, Settings, StickyNote, Users } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { GlobalSearch } from '../search/GlobalSearch'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useClickOutside } from '../../hooks/useClickOutside'
import { cn } from '../../lib/cn'
import { isManagerOrAdmin } from '../../lib/permissions'
import { roleLabels } from '../../lib/taskLabels'
import { NotificationBell } from '../notifications/NotificationBell'
import { TaskModalProvider } from '../tasks/TaskModalProvider'

const desktopNavItems = [
  { label: 'Today', to: '/', icon: Home },
  { label: 'Tasks', to: '/my-tasks', icon: ListChecks },
  { label: 'New', to: '/create', icon: PlusCircle },
  { label: 'Notes', to: '/handover', icon: StickyNote },
  { label: 'Staff', to: '/team', icon: Users },
  { label: 'Manage', to: '/settings', icon: Settings },
]

const mobileNavItems = [
  { label: 'Today', to: '/', icon: Home },
  { label: 'Tasks', to: '/my-tasks', icon: ListChecks },
  { label: 'New', to: '/create', icon: PlusCircle },
  { label: 'Notes', to: '/handover', icon: StickyNote },
  { label: 'Manage', to: '/settings', icon: Settings },
]

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition',
    isActive ? 'bg-accent/10 text-accentDark' : 'text-muted hover:bg-surface hover:text-text',
  )

export function AppShell() {
  const { user, profile, signOut } = useAuth()
  const accountRef = useRef<HTMLDivElement | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const showNavigation = profile?.is_approved === true
  const visibleDesktopNavItems = desktopNavItems.filter((item) => item.to !== '/team' || isManagerOrAdmin(profile))
  const isOnline = useOnlineStatus()
  useClickOutside(accountRef, () => setAccountOpen(false), accountOpen)

  return (
    <TaskModalProvider>
    <div className="min-h-screen bg-background text-text">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
          <NavLink to="/" className="leading-tight">
            <span className="block font-heading text-2xl font-bold text-text">Oasis Tasks</span>
            <span className="hidden text-xs text-muted sm:block">Staff workspace</span>
          </NavLink>
          <div className="flex items-center gap-3">
            {showNavigation ? <GlobalSearch /> : null}
            {showNavigation ? <NotificationBell /> : null}
            {profile ? (
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface text-sm font-semibold text-text transition hover:border-accent"
                  aria-label="Account menu"
                  onClick={() => setAccountOpen((value) => !value)}
                >
                  <Avatar name={profile.full_name} id={profile.id} className="h-8 w-8 rounded-xl" />
                </button>
                {accountOpen ? (
                  <div className="absolute right-0 top-14 z-50 w-60 origin-top-right rounded-2xl border border-border bg-surface p-4 shadow-xl shadow-text/10">
                    <p className="text-sm font-semibold text-text">{profile.full_name}</p>
                    <p className="mt-1 truncate text-xs text-muted" title={user?.email ?? profile.email}>{user?.email ?? profile.email}</p>
                    <p className="mt-1 text-xs text-muted">{roleLabels[profile.role]}</p>
                    <Button type="button" variant="secondary" className="mt-4 w-full" onClick={signOut}>
                      Sign out
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>
      {!isOnline ? (
        <div className="border-b border-warning/30 bg-warning/10 px-5 py-2 text-center text-sm font-medium text-text">
          You appear to be offline. Changes may not save until connection is restored.
        </div>
      ) : null}

      <div className="grid lg:grid-cols-[220px_1fr]">
        {showNavigation ? (
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] border-r border-border/60 px-4 py-6 lg:block">
          <nav className="flex flex-col gap-2">
            {visibleDesktopNavItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navClass}>
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        ) : null}

        <main className="min-h-[calc(100vh-4rem)] px-4 py-5 pb-28 md:px-7 md:py-8 lg:px-10 lg:pb-10">
          <Outlet />
        </main>
      </div>

      {showNavigation ? (
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 px-2 py-2 backdrop-blur lg:hidden">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-center text-xs font-semibold transition',
                isActive ? 'bg-accent/10 text-accentDark' : 'text-muted',
              )
            }
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      ) : null}
    </div>
    </TaskModalProvider>
  )
}
