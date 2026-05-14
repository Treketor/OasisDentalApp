import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <p className="text-sm font-semibold uppercase tracking-wide text-accentDark">404</p>
        <h1 className="mt-3 font-heading text-5xl font-bold uppercase text-text">Page not found</h1>
        <p className="mt-3 text-muted">This page is not available in Oasis Tasks.</p>
        <Link
          to="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-accent bg-accent px-5 text-sm font-semibold text-white transition hover:border-accentDark hover:bg-accentDark"
        >
          Back to Today
        </Link>
      </Card>
    </div>
  )
}
