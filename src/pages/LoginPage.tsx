import { Navigate } from 'react-router-dom'
import { AuthForm } from '../components/auth/AuthForm'
import { useAuth } from '../components/auth/useAuth'
import { supabaseEnv } from '../lib/supabase'

export function LoginPage() {
  const { session } = useAuth()

  if (session) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <section className="w-full max-w-md">
        <p className="mb-4 text-center font-heading text-4xl font-bold text-text">
          Oasis Tasks
        </p>
        <div className="rounded-lg border border-border bg-surface p-6">
          <h1 className="font-heading text-4xl font-semibold text-text">Staff login</h1>
          <p className="mb-6 mt-2 text-sm leading-6 text-muted">
            Lightweight tasks and notes for Oasis Dental staff. New accounts require manager approval before access.
          </p>
          {!supabaseEnv.isConfigured ? (
            <p className="mb-4 rounded-lg border border-urgent/30 bg-urgent/5 px-4 py-3 text-sm leading-6 text-urgent">
              Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before signing in.
            </p>
          ) : null}
          <AuthForm />
        </div>
      </section>
    </main>
  )
}
