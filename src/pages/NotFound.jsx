import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-base px-4 text-center">
      <h1 className="font-display text-2xl font-semibold text-ink">Page not found</h1>
      <p className="text-sm text-steel-500">The page you're looking for doesn't exist.</p>
      <Link to="/dashboard" className="btn-primary">Go to dashboard</Link>
    </div>
  )
}
