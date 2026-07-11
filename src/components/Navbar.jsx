import { Link, useNavigate } from 'react-router-dom'
import { LayoutGrid, Wrench, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-10 border-b border-steel-100 bg-steel-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Wrench size={18} className="text-signal-teal" />
          <span className="font-display text-sm font-semibold tracking-wide">
            MaintainIQ
          </span>
        </Link>

        <nav className="flex items-center gap-5 text-sm">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-steel-100 hover:text-white">
            <LayoutGrid size={15} /> Dashboard
          </Link>
          <Link to="/assets" className="flex items-center gap-1.5 text-steel-100 hover:text-white">
            <Wrench size={15} /> Assets
          </Link>
          <span className="tag-mono rounded-tag border border-steel-500 px-2 py-1 text-steel-100">
            {profile?.role || '…'}
          </span>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 text-steel-100 hover:text-white">
            <LogOut size={15} /> Sign out
          </button>
        </nav>
      </div>
    </header>
  )
}
