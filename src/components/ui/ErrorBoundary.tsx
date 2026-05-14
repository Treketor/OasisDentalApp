import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Home, RefreshCcw } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from './Button'

interface ErrorBoundaryProps {
  children: ReactNode
  resetKey?: string
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('App error boundary caught an error', error, errorInfo)
    }
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10 text-text">
        <section className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-xl shadow-text/5 sm:p-8">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accentDark">
            <RefreshCcw className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="font-heading text-2xl font-semibold text-text">Oasis Tasks</p>
          <h1 className="mt-4 font-heading text-4xl font-semibold leading-tight text-text">Something went wrong</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            The app hit a temporary problem while loading this view. Refreshing usually clears it.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button type="button" className="gap-2" onClick={() => window.location.reload()}>
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
            <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 text-sm font-semibold text-text transition hover:border-accent hover:text-accentDark" to="/">
              <Home className="h-4 w-4" aria-hidden="true" />
              Today
            </Link>
          </div>
          {import.meta.env.DEV ? (
            <p className="mt-5 rounded-2xl bg-background px-4 py-3 text-xs leading-5 text-muted">
              Development builds log the full error in the browser console.
            </p>
          ) : null}
        </section>
      </div>
    )
  }
}

export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation()
  return <ErrorBoundary resetKey={location.key}>{children}</ErrorBoundary>
}
