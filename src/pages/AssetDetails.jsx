import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import Navbar from '../components/Navbar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import PriorityBadge from '../components/PriorityBadge.jsx'
import QRBlock from '../components/QRBlock.jsx'
import PageWrapper from '../components/PageWrapper.jsx'
import { motion } from 'framer-motion'

const STATUSES = ['Operational', 'Issue Reported', 'Under Inspection', 'Under Maintenance', 'Out of Service', 'Retired']
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair', 'Fixed', 'Damaged']

export default function AssetDetails() {
  const { id } = useParams()
  const { isAdmin, user, profile } = useAuth()

  const [asset, setAsset] = useState(null)
  const [issues, setIssues] = useState([])
  const [history, setHistory] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [quickCondition, setQuickCondition] = useState('')
  const [updatingCondition, setUpdatingCondition] = useState(false)

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
    setQuickCondition(assetData?.condition || 'Good')
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

  async function handleQuickConditionUpdate() {
    setUpdatingCondition(true)
    const { error } = await supabase.from('assets').update({ condition: quickCondition }).eq('id', id)
    if (!error) {
      await supabase.from('asset_history').insert({
        asset_id: id,
        action: `Condition updated to ${quickCondition}`,
        actor_id: user?.id,
      })
      loadAll()
    }
    setUpdatingCondition(false)
  }

  async function handleQuickResolve(issueId) {
    if (!confirm('Mark this issue as fixed?')) return
    // First insert a quick maintenance record so the DB trigger doesn't fail
    await supabase.from('maintenance_records').insert({
      issue_id: issueId,
      technician_id: user?.id,
      work_performed: 'Quick fix applied from Asset Details page.',
      final_condition: 'Fixed',
      time_spent_minutes: 0,
    })
    
    // Then update the issue status to Resolved
    await supabase.from('issues').update({ status: 'Resolved' }).eq('id', issueId)
    
    // Also update asset status and condition
    await supabase.from('assets').update({ status: 'Operational', condition: 'Fixed' }).eq('id', id)
    
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
    <PageWrapper>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link to="/assets" className="text-sm text-steel-500 hover:text-signal-teal">← Back to assets</Link>

        <motion.div 
          className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1 }
            }
          }}
        >
          {/* Left column: details */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div 
              className="card p-5"
              variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
            >
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
            </motion.div>

            {(!isAdmin && profile?.role === 'technician') && (
              <motion.div 
                className="card p-5"
                variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
              >
                <h3 className="font-display text-sm font-semibold text-ink">Update Condition</h3>
                <p className="mt-1 text-xs text-steel-500">Quickly log the current condition of this asset.</p>
                <div className="mt-3 flex gap-2">
                  <select 
                    className="input flex-1" 
                    value={quickCondition} 
                    onChange={(e) => setQuickCondition(e.target.value)}
                  >
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button 
                    className="btn-primary" 
                    onClick={handleQuickConditionUpdate}
                    disabled={updatingCondition || quickCondition === asset.condition}
                  >
                    {updatingCondition ? 'Saving…' : 'Update'}
                  </button>
                </div>
              </motion.div>
            )}

            {isAdmin && (
              <motion.div 
                className="card p-5"
                variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
              >
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
              </motion.div>
            )}

            <motion.div 
              className="card p-5"
              variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
            >
              <h3 className="font-display text-sm font-semibold text-ink">Issues for this asset</h3>
              {issues.length === 0 ? (
                <p className="mt-2 text-sm text-steel-500">No issues reported yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-steel-50">
                  {issues.map((issue) => (
                    <li key={issue.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3">
                      <div className="flex-1">
                        <Link to={`/issues/${issue.id}`} className="text-sm font-medium text-ink hover:text-signal-teal">
                          {issue.title}
                          <span className="tag-mono ml-2 text-steel-500">{issue.issue_number}</span>
                        </Link>
                        <div className="flex items-center gap-3 mt-1.5">
                          <PriorityBadge priority={issue.priority} />
                          <StatusBadge status={issue.status} kind="issue" />
                        </div>
                      </div>
                      
                      {/* Quick resolve action for open issues */}
                      {(isAdmin || profile?.role === 'technician') && !['Resolved', 'Closed'].includes(issue.status) && (
                        <button 
                          onClick={() => handleQuickResolve(issue.id)}
                          className="btn-outline text-xs px-3 py-1 whitespace-nowrap"
                        >
                          Mark Fixed
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>

            <motion.div 
              className="card p-5"
              variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
            >
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
            </motion.div>
          </div>

          {/* Right column: QR */}
          <motion.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}>
            <QRBlock asset={asset} />
          </motion.div>
        </motion.div>
      </main>
    </PageWrapper>
  )
}
