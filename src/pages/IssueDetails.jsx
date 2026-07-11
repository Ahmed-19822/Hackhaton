import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import Navbar from '../components/Navbar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import PriorityBadge from '../components/PriorityBadge.jsx'
import PageWrapper from '../components/PageWrapper.jsx'
import { motion } from 'framer-motion'

const NEXT_STATUS = {
  Reported: ['Assigned'],
  Assigned: ['Inspection Started'],
  'Inspection Started': ['Maintenance In Progress', 'Waiting for Parts'],
  'Waiting for Parts': ['Maintenance In Progress'],
  'Maintenance In Progress': ['Resolved', 'Waiting for Parts'],
  Resolved: ['Closed', 'Reopened'],
  Closed: ['Reopened'],
  Reopened: ['Assigned', 'Inspection Started'],
}

const emptyNote = { inspection_notes: '', work_performed: '', parts_used: '', cost: '', time_spent_minutes: '', final_condition: '' }

export default function IssueDetails() {
  const { id } = useParams()
  const { user, isAdmin, profile } = useAuth()

  const [issue, setIssue] = useState(null)
  const [asset, setAsset] = useState(null)
  const [records, setRecords] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [note, setNote] = useState(emptyNote)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingNote, setSavingNote] = useState(false)

  async function loadAll() {
    setLoading(true)
    const { data: issueData } = await supabase.from('issues').select('*').eq('id', id).single()
    if (issueData) {
      const [{ data: assetData }, { data: recordData }, { data: techData }] = await Promise.all([
        supabase.from('assets').select('*').eq('id', issueData.asset_id).single(),
        supabase.from('maintenance_records').select('*').eq('issue_id', id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'technician'),
      ])
      setAsset(assetData)
      setRecords(recordData || [])
      setTechnicians(techData || [])
    }
    setIssue(issueData)
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const canAct = isAdmin || issue?.assigned_technician === user?.id

  async function assignTechnician(technicianId) {
    setError('')
    const { error } = await supabase
      .from('issues')
      .update({ assigned_technician: technicianId, status: issue.status === 'Reported' ? 'Assigned' : issue.status })
      .eq('id', id)
    if (error) setError(error.message)
    loadAll()
  }

  async function changeStatus(newStatus) {
    setError('')
    const { error } = await supabase.from('issues').update({ status: newStatus }).eq('id', id)
    if (error) setError(error.message)
    loadAll()
  }

  async function submitNote(e) {
    e.preventDefault()
    setSavingNote(true)
    setError('')
    const payload = {
      issue_id: id,
      technician_id: user?.id,
      inspection_notes: note.inspection_notes || null,
      work_performed: note.work_performed || null,
      parts_used: note.parts_used || null,
      cost: note.cost === '' ? 0 : Number(note.cost),
      time_spent_minutes: note.time_spent_minutes === '' ? null : Number(note.time_spent_minutes),
      final_condition: note.final_condition || null,
    }
    const { error } = await supabase.from('maintenance_records').insert(payload)
    setSavingNote(false)
    if (error) {
      setError(error.message)
      return
    }
    setNote(emptyNote)
    loadAll()
  }

  if (loading || !issue) {
    return (
      <div className="min-h-screen bg-base">
        <Navbar />
        <p className="p-8 text-sm text-steel-500">Loading…</p>
      </div>
    )
  }

  const nextOptions = NEXT_STATUS[issue.status] || []
  const ai = issue.ai_suggested_json

  return (
    <PageWrapper>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {asset && (
          <Link to={`/assets/${asset.id}`} className="text-sm text-steel-500 hover:text-signal-teal">
            ← Back to {asset.name}
          </Link>
        )}

        <motion.div 
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
          <motion.div 
            className="card mt-3 p-5"
            variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
          >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="tag-mono text-steel-500">{issue.issue_number}</p>
              <h1 className="font-display text-xl font-semibold text-ink">{issue.title}</h1>
            </div>
            <div className="flex flex-col items-end gap-2">
              <PriorityBadge priority={issue.priority} />
              <StatusBadge status={issue.status} kind="issue" />
            </div>
          </div>

          <p className="mt-3 text-sm text-steel-700">{issue.description}</p>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="label">Category</dt><dd className="text-ink">{issue.category || '—'}</dd></div>
            <div><dt className="label">Reporter</dt><dd className="text-ink">{issue.reporter_name || 'Anonymous'}</dd></div>
            <div><dt className="label">Reported</dt><dd className="text-ink">{new Date(issue.created_at).toLocaleString()}</dd></div>
            <div><dt className="label">Last updated</dt><dd className="text-ink">{new Date(issue.updated_at).toLocaleString()}</dd></div>
          </dl>
        </motion.div>

        {ai && (
          <motion.div 
            className="card mt-4 border-l-4 border-l-signal-teal p-5"
            variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
          >
            <h3 className="font-display text-sm font-semibold text-ink">AI Issue Triage suggestion</h3>
            <p className="mt-1 text-xs text-steel-500">
              {issue.ai_was_edited ? 'Reviewed and edited by reporter before submission.' : 'Submitted as suggested.'}
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="label">Suggested category / priority</dt><dd className="text-ink">{ai.category} · {ai.priority}</dd></div>
              <div><dt className="label">Possible causes</dt><dd className="text-ink">{(ai.possible_causes || []).join(', ')}</dd></div>
              <div><dt className="label">Initial checks</dt><dd className="text-ink">{(ai.initial_checks || []).join(', ')}</dd></div>
              {ai.recurring_pattern_warning && (
                <div className="rounded-tag border border-red-100 bg-red-50 px-3 py-2 text-signal-rust">
                  {ai.recurring_pattern_warning}
                </div>
              )}
            </dl>
          </motion.div>
        )}

        {error && (
          <motion.p 
            className="mt-4 rounded-tag border border-red-100 bg-red-50 px-3 py-2 text-sm text-signal-rust"
            variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
          >
            {error}
          </motion.p>
        )}

        {isAdmin && (
          <motion.div 
            className="card mt-4 p-5"
            variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
          >
            <h3 className="font-display text-sm font-semibold text-ink">Assign technician</h3>
            <select
              className="input mt-2"
              value={issue.assigned_technician || ''}
              onChange={(e) => assignTechnician(e.target.value)}
            >
              <option value="">Unassigned</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name || t.email}</option>
              ))}
            </select>
          </motion.div>
        )}

        {canAct && nextOptions.length > 0 && (
          <motion.div 
            className="card mt-4 p-5"
            variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
          >
           <h3 className="font-display text-sm font-semibold text-ink">
  Technician Update
</h3>

<p className="mt-1 text-sm text-steel-500">
  Update the problem status and maintenance progress.
</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {nextOptions.map((s) => (
                <button key={s} className="btn-outline" onClick={() => changeStatus(s)}>
                  Move to “{s}”
                </button>
              ))}
            </div>
            {nextOptions.includes('Resolved') && records.length === 0 && (
              <p className="mt-2 text-xs text-signal-amber">
                Add at least one maintenance record below before resolving.
              </p>
            )}
          </motion.div>
        )}

        {canAct && (
          <motion.form 
            onSubmit={submitNote} 
            className="card mt-4 space-y-3 p-5"
            variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
          >
            <h3 className="font-display text-sm font-semibold text-ink">Add maintenance record</h3>
            <div>
              <label className="label">Inspection notes</label>
              <textarea className="input" rows={2} value={note.inspection_notes} onChange={(e) => setNote({ ...note, inspection_notes: e.target.value })} />
            </div>
            <div>
              <label className="label">Work performed</label>
              <textarea className="input" rows={2} value={note.work_performed} onChange={(e) => setNote({ ...note, work_performed: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Parts used</label><input className="input" value={note.parts_used} onChange={(e) => setNote({ ...note, parts_used: e.target.value })} /></div>
              <div><label className="label">Final condition</label><input className="input" value={note.final_condition} onChange={(e) => setNote({ ...note, final_condition: e.target.value })} /></div>
              <div><label className="label">Cost</label><input type="number" min="0" step="0.01" className="input" value={note.cost} onChange={(e) => setNote({ ...note, cost: e.target.value })} /></div>
              <div><label className="label">Time spent (minutes)</label><input type="number" min="0" className="input" value={note.time_spent_minutes} onChange={(e) => setNote({ ...note, time_spent_minutes: e.target.value })} /></div>
            </div>
            <button className="btn-primary" disabled={savingNote}>{savingNote ? 'Saving…' : 'Save record'}</button>
          </motion.form>
        )}

        <motion.div 
          className="card mt-4 p-5"
          variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
        >
          <h3 className="font-display text-sm font-semibold text-ink">Maintenance history</h3>
          {records.length === 0 ? (
            <p className="mt-2 text-sm text-steel-500">No maintenance recorded yet.</p>
          ) : (
            <ul className="mt-3 space-y-4">
              {records.map((r) => (
                <li key={r.id} className="border-b border-steel-50 pb-3 last:border-0">
                  <p className="tag-mono text-steel-300">{new Date(r.created_at).toLocaleString()}</p>
                  {r.inspection_notes && <p className="mt-1 text-sm text-ink"><strong>Inspection:</strong> {r.inspection_notes}</p>}
                  {r.work_performed && <p className="text-sm text-ink"><strong>Work:</strong> {r.work_performed}</p>}
                  <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-steel-500">
                    {r.parts_used && <span>Parts: {r.parts_used}</span>}
                    {r.cost != null && <span>Cost: {r.cost}</span>}
                    {r.time_spent_minutes != null && <span>Time: {r.time_spent_minutes} min</span>}
                    {r.final_condition && <span>Condition: {r.final_condition}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
        </motion.div>
      </main>
    </PageWrapper>
  )
}
