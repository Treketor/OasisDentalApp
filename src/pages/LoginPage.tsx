import { Navigate } from 'react-router-dom'
import { AuthForm } from '../components/auth/AuthForm'
import { useAuth } from '../components/auth/useAuth'

export function LoginPage() {
  const { session } = useAuth()

  if (session) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <section className="w-full max-w-md">
        <p className="mb-4 text-center font-heading text-4xl font-bold uppercase text-text">
          OASIS TASKS
        </p>
        <div className="rounded-lg border border-border bg-surface p-6">
          <h1 className="font-heading text-4xl font-semibold uppercase text-text">Staff Login</h1>
          <p className="mb-6 mt-2 text-sm leading-6 text-muted">
            Sign in or request access. Manager approval is required before clinic task access.
          </p>
          <AuthForm />
        </div>
      </section>
    </main>
  )
}
