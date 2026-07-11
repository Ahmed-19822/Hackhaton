import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { session, isAdmin, loading } = useAuth()

  if (loading) {
    return <div className="p-8 text-sm text-steel-500">Loading…</div>
  }
  if (!session) {
    return <Navigate to="/login" replace />
  }
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}
