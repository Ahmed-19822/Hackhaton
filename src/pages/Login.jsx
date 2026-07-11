import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Wrench size={28} className="text-signal-teal" />
          <h1 className="font-display text-xl font-semibold text-ink">MaintainIQ</h1>
          <p className="text-sm text-steel-500">Staff sign in</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          {error && (
            <p className="rounded-tag border border-red-100 bg-red-50 px-3 py-2 text-sm text-signal-rust">
              {error}
            </p>
          )}
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organization.com"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-steel-500">
          No account?{' '}
          <Link to="/signup" className="text-signal-teal hover:underline">
            Create one
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-steel-500">
          Reporting an issue?{' '}
          <span className="text-steel-500">Scan the asset's QR code instead — no login needed.</span>
        </p>
      </div>
    </div>
  )
}
