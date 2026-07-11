import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('technician')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }

    if (data.session) {
      navigate('/dashboard')
    } else {
      setNotice('Account created. Check your email to confirm, then sign in.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Wrench size={28} className="text-signal-teal" />
          <h1 className="font-display text-xl font-semibold text-ink">Create staff account</h1>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          {error && (
            <p className="rounded-tag border border-red-100 bg-red-50 px-3 py-2 text-sm text-signal-rust">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-tag border border-steel-100 bg-steel-50 px-3 py-2 text-sm text-steel-700">
              {notice}
            </p>
          )}
          <div>
            <label className="label">Full name</label>
            <input className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="technician">Technician</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-steel-500">
          Already have an account?{' '}
          <Link to="/login" className="text-signal-teal hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
