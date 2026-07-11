import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Wrench, Sparkles, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { triageComplaint } from '../lib/aiTriage'

export default function ReportIssue() {
  const { code } = useParams()
  const navigate = useNavigate()

  const [asset, setAsset] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [complaint, setComplaint] = useState('')
  const [reporterName, setReporterName] = useState('')
  const [reporterContact, setReporterContact] = useState('')

  const [suggestion, setSuggestion] = useState(null)
  const [reviewed, setReviewed] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('Medium')

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('public_asset_view')
        .select('*')
        .eq('asset_code', code)
        .single()
      if (error || !data) {
        setNotFound(true)
        return
      }
      setAsset(data)
    }
    load()
  }, [code])

  function runTriage() {
    const result = triageComplaint(complaint, { assetName: asset?.name, assetCategory: asset?.category })
    setSuggestion(result)
    setTitle(result.title)
    setCategory(result.category)
    setPriority(result.priority)
    setReviewed(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const wasEdited =
      suggestion &&
      (title !== suggestion.title || category !== suggestion.category || priority !== suggestion.priority)

    const { data, error } = await supabase
      .from('issues')
      .insert({
        asset_id: asset.id,
        title: title || complaint.slice(0, 70),
        description: complaint,
        category: category || null,
        priority,
        reporter_name: reporterName || null,
        reporter_contact: reporterContact || null,
        ai_suggested_json: suggestion || null,
        ai_was_edited: Boolean(wasEdited),
      })
      .select()
      .single()

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setSubmitted(data)
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base px-4 text-center text-sm text-steel-500">
        Asset “{code}” not found. Please rescan the QR code.
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base px-4">
        <div className="card max-w-sm p-6 text-center">
          <CheckCircle2 size={28} className="mx-auto text-signal-teal" />
          <h1 className="mt-2 font-display text-lg font-semibold text-ink">Issue reported</h1>
          <p className="mt-1 tag-mono text-steel-500">{submitted.issue_number}</p>
          <p className="mt-3 text-sm text-steel-700">
            Thanks — our maintenance team has been notified and will triage this shortly.
          </p>
          <Link to={`/asset/${code}`} className="btn-outline mt-5 inline-flex">Back to asset page</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-center gap-2 text-steel-500">
          <Wrench size={18} className="text-signal-teal" />
          <span className="font-display text-sm font-semibold tracking-wide">MaintainIQ</span>
        </div>

        <div className="card mt-4 p-6">
          <h1 className="font-display text-lg font-semibold text-ink">Report an issue</h1>
          {asset && (
            <p className="mt-1 text-sm text-steel-500">
              {asset.name} <span className="tag-mono">({asset.asset_code})</span>
            </p>
          )}

          {error && (
            <p className="mt-3 rounded-tag border border-red-100 bg-red-50 px-3 py-2 text-sm text-signal-rust">{error}</p>
          )}

          {!reviewed ? (
            <div className="mt-4 space-y-4">
              <div>
                <label className="label">Describe the problem</label>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="e.g. The projector display is flickering and sometimes does not detect HDMI."
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Your name (optional)</label>
                <input className="input" value={reporterName} onChange={(e) => setReporterName(e.target.value)} />
              </div>
              <div>
                <label className="label">Contact (optional)</label>
                <input className="input" value={reporterContact} onChange={(e) => setReporterContact(e.target.value)} />
              </div>
              <button className="btn-primary w-full" disabled={!complaint.trim()} onClick={runTriage}>
                <Sparkles size={15} /> Review with AI triage
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="rounded-tag border border-steel-100 bg-steel-50 p-3 text-xs text-steel-500">
                <p className="font-medium text-steel-700">AI-suggested triage — review before submitting</p>
                <p className="mt-1">Possible causes: {suggestion.possible_causes.join(', ')}</p>
                <p className="mt-1">Initial checks: {suggestion.initial_checks.join(', ')}</p>
                {suggestion.recurring_pattern_warning && (
                  <p className="mt-2 font-medium text-signal-rust">{suggestion.recurring_pattern_warning}</p>
                )}
              </div>

              <div>
                <label className="label">Title</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button type="button" className="btn-outline" onClick={() => setReviewed(false)}>
                  Back
                </button>
                <button className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit issue'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
