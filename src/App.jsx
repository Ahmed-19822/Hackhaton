import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'

import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Assets from './pages/Assets.jsx'
import AssetDetails from './pages/AssetDetails.jsx'
import IssueDetails from './pages/IssueDetails.jsx'
import PublicAsset from './pages/PublicAsset.jsx'
import ReportIssue from './pages/ReportIssue.jsx'
import NotFound from './pages/NotFound.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

export default function App() {
  const { session, loading } = useAuth()

  return (
    <Routes>
      {/* Root redirects based on auth state */}
      <Route
        path="/"
        element={
          loading ? (
            <div className="p-8 text-sm text-steel-500">Loading…</div>
          ) : (
            <Navigate to={session ? '/dashboard' : '/login'} replace />
          )
        }
      />

      {/* Public routes — reachable via QR scan, no login required */}
      <Route path="/asset/:code" element={<PublicAsset />} />
      <Route path="/report/:code" element={<ReportIssue />} />

      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Internal (staff-only) routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} />
      <Route path="/assets/:id" element={<ProtectedRoute><AssetDetails /></ProtectedRoute>} />
      <Route path="/issues/:id" element={<ProtectedRoute><IssueDetails /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
