import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Wrench, MapPin, Tag } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function PublicAsset() {
  const { code } = useParams()
const { profile } = useAuth()

const isTechnician = profile?.role === 'technician'

  const [asset, setAsset] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('public_asset_view')
        .select('*')
        .eq('asset_code', code)
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setAsset(data)

      const { data: activity } = await supabase
        .from('public_issue_status_view')
        .select('*')
        .eq('asset_id', data.id)
        .order('created_at', { ascending: false })
        .limit(5)
      setRecentActivity(activity || [])
      setLoading(false)
    }
    load()
  }, [code])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-steel-500">Loading…</div>
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-base px-4 text-center">
        <Wrench size={28} className="text-steel-300" />
        <h1 className="font-display text-lg font-semibold text-ink">Asset not found</h1>
        <p className="max-w-sm text-sm text-steel-500">
          The code “{code}” doesn't match any registered asset. Double-check the QR code or link.
        </p>
      </div>
    )
  }

  const isRetired = asset.status === 'Retired'

  return (
    <div className="min-h-screen bg-base px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-center gap-2 text-steel-500">
          <Wrench size={18} className="text-signal-teal" />
          <span className="font-display text-sm font-semibold tracking-wide">MaintainIQ</span>
        </div>

        <div className="card mt-4 p-6">
          {isRetired && (
            <div className="mb-4 rounded-tag border border-steel-100 bg-steel-50 px-3 py-2 text-center text-xs font-medium uppercase tracking-wide text-signal-slate">
              Retired asset — read only
            </div>
          )}

          <p className="tag-mono text-center text-steel-500">{asset.asset_code}</p>
          <h1 className="mt-1 text-center font-display text-xl font-semibold text-ink">{asset.name}</h1>
          <div className="mt-2 flex justify-center">
            <StatusBadge status={asset.status} kind="asset" />
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-3 text-sm">
            {asset.category && (
              <div className="flex items-center gap-2 text-steel-700">
                <Tag size={14} className="text-steel-300" /> {asset.category}
              </div>
            )}
            {asset.location && (
              <div className="flex items-center gap-2 text-steel-700">
                <MapPin size={14} className="text-steel-300" /> {asset.location}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 rounded-tag bg-steel-50 p-3 text-xs">
              <div><dt className="text-steel-500">Condition</dt><dd className="text-ink">{asset.condition || '—'}</dd></div>
              <div><dt className="text-steel-500">Last service</dt><dd className="text-ink">{asset.last_service_date || '—'}</dd></div>
              <div><dt className="text-steel-500">Next service</dt><dd className="text-ink">{asset.next_service_date || '—'}</dd></div>
              <div><dt className="text-steel-500">Org</dt><dd className="text-ink">{asset.organization_name || '—'}</dd></div>
            </div>
          </dl>

{!isRetired && (
  isTechnician ? (
    <Link
      to={`/assets/${asset.id}`}
      className="btn-primary mt-5 w-full"
    >
      Update the Issue
    </Link>
  ) : (
    <Link
      to={`/report/${asset.asset_code}`}
      className="btn-primary mt-5 w-full"
    >
      Report an Issue
    </Link>
  )
)}
        </div>

        {recentActivity.length > 0 && (
          <div className="card mt-4 p-5">
            <h3 className="font-display text-sm font-semibold text-ink">Recent activity</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {recentActivity.map((a) => (
                <li key={a.issue_number} className="flex items-center justify-between">
                  <span className="text-steel-700">{a.title}</span>
                  <StatusBadge status={a.status} kind="issue" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
