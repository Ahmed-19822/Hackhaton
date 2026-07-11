import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import Navbar from '../components/Navbar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import PriorityBadge from '../components/PriorityBadge.jsx'
import QRBlock from '../components/QRBlock.jsx'

const STATUSES = ['Operational', 'Issue Reported', 'Under Inspection', 'Under Maintenance', 'Out of Service', 'Retired']

export default function AssetDetails() {
  const { id } = useParams()
  const { isAdmin, user } = useAuth()

  const [asset, setAsset] = useState(null)
  const [issues, setIssues] = useState([])
  const [history, setHistory] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)

  async function loadAll() {
    setLoading(true)
    const [{ data: assetData }, { data: issueData }, { data: historyData }, { data: techData }] = await Promise.all([
      supabase.from('assets').select('*').eq('id', id).single(),
      supabase.from('issues').select('*').eq('asset_id', id).order('created_at', { ascending: false }),
      supabase.from('asset_history').select('*').eq('asset_id', id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'technician'),
    ])
    setAsset(assetData)
    setForm(assetData)
    setIssues(issueData || [])
    setHistory(historyData || [])
    setTechnicians(techData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleSave(e) {
    e.preventDefault()
    const { id: _id, created_at, updated_at, ...updates } = form
    const { error } = await supabase.from('assets').update(updates).eq('id', id)
    if (!error) {
      await supabase.from('asset_history').insert({
        asset_id: id,
        action: 'Asset details updated',
        actor_id: user?.id,
      })
      setEditing(false)
      loadAll()
    }
  }

  async function handleAssignTechnician(technicianId) {
    await supabase.from('assets').update({ assigned_technician: technicianId || null }).eq('id', id)
    await supabase.from('asset_history').insert({
      asset_id: id,
      action: technicianId ? 'Technician assigned to asset' : 'Technician unassigned',
      actor_id: user?.id,
    })
    loadAll()
  }

  async function handleRetire() {
    if (!confirm('Retire this asset? It will remain readable but flagged as Retired.')) return
    await supabase.from('assets').update({ status: 'Retired' }).eq('id', id)
    await supabase.from('asset_history').insert({ asset_id: id, action: 'Asset retired', actor_id: user?.id })
    loadAll()
  }

  if (loading || !asset) {
    return (
      <div className="min-h-screen bg-base">
        <Navbar />
        <p className="p-8 text-sm text-steel-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link to="/assets" className="text-sm text-steel-500 hover:text-signal-teal">← Back to assets</Link>

        <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column: details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-display text-xl font-semibold text-ink">{asset.name}</h1>
                  <p className="tag-mono mt-1 text-steel-500">{asset.asset_code}</p>
                </div>
                <StatusBadge status={asset.status} kind="asset" />
              </div>

              {!editing ? (
                <>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="label">Category</dt><dd className="text-ink">{asset.category || '—'}</dd></div>
                    <div><dt className="label">Location</dt><dd className="text-ink">{asset.location || '—'}</dd></div>
                    <div><dt className="label">Condition</dt><dd className="text-ink">{asset.condition || '—'}</dd></div>
                    <div><dt className="label">Organization</dt><dd className="text-ink">{asset.organization_name || '—'}</dd></div>
                    <div><dt className="label">Last service</dt><dd className="text-ink">{asset.last_service_date || '—'}</dd></div>
                    <div><dt className="label">Next service</dt><dd className="text-ink">{asset.next_service_date || '—'}</dd></div>
                  </dl>
                  {isAdmin && (
                    <div className="mt-4 flex gap-2">
                      <button className="btn-outline" onClick={() => setEditing(true)}>Edit details</button>
                      {asset.status !== 'Retired' && (
                        <button className="btn-danger" onClick={handleRetire}>Retire asset</button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={handleSave} className="mt-4 grid grid-cols-2 gap-3">
                  <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><label className="label">Category</label><input className="input" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                  <div><label className="label">Location</label><input className="input" value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                  <div><label className="label">Condition</label><input className="input" value={form.condition || ''} onChange={(e) => setForm({ ...form, condition: e.target.value })} /></div>
                  <div><label className="label">Last service date</label><input type="date" className="input" value={form.last_service_date || ''} onChange={(e) => setForm({ ...form, last_service_date: e.target.value })} /></div>
                  <div><label className="label">Next service date</label><input type="date" className="input" value={form.next_service_date || ''} onChange={(e) => setForm({ ...form, next_service_date: e.target.value })} /></div>
                  <div className="col-span-2 flex gap-2">
                    <button className="btn-primary" type="submit">Save changes</button>
                    <button className="btn-outline" type="button" onClick={() => { setEditing(false); setForm(asset) }}>Cancel</button>
                  </div>
                </form>
              )}
            </div>

            {isAdmin && (
              <div className="card p-5">
                <h3 className="font-display text-sm font-semibold text-ink">Assigned technician</h3>
                <select
                  className="input mt-2"
                  value={asset.assigned_technician || ''}
                  onChange={(e) => handleAssignTechnician(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name || t.email}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="card p-5">
              <h3 className="font-display text-sm font-semibold text-ink">Issues for this asset</h3>
              {issues.length === 0 ? (
                <p className="mt-2 text-sm text-steel-500">No issues reported yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-steel-50">
                  {issues.map((issue) => (
                    <li key={issue.id} className="flex items-center justify-between py-2">
                      <Link to={`/issues/${issue.id}`} className="text-sm font-medium text-ink hover:text-signal-teal">
                        {issue.title}
                        <span className="tag-mono ml-2 text-steel-500">{issue.issue_number}</span>
                      </Link>
                      <div className="flex items-center gap-3">
                        <PriorityBadge priority={issue.priority} />
                        <StatusBadge status={issue.status} kind="issue" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card p-5">
              <h3 className="font-display text-sm font-semibold text-ink">Asset history</h3>
              {history.length === 0 ? (
                <p className="mt-2 text-sm text-steel-500">No activity recorded yet.</p>
              ) : (
                <ol className="mt-3 space-y-3 border-l border-steel-100 pl-4">
                  {history.map((h) => (
                    <li key={h.id} className="relative text-sm">
                      <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-steel-500" />
                      <p className="text-ink">{h.action}</p>
                      {h.details && <p className="text-steel-500">{h.details}</p>}
                      <p className="tag-mono text-steel-300">{new Date(h.created_at).toLocaleString()}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          {/* Right column: QR */}
          <div>
            <QRBlock asset={asset} />
          </div>
        </div>
      </main>
    </div>
  )
}
