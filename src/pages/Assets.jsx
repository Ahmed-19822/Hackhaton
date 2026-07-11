import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Plus, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext.jsx'
import Navbar from '../components/Navbar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import PageWrapper from '../components/PageWrapper.jsx'
import { motion, AnimatePresence } from 'framer-motion'

const STATUSES = ['Operational', 'Issue Reported', 'Under Inspection', 'Under Maintenance', 'Out of Service', 'Retired']

const emptyForm = { asset_code: '', name: '', category: '', location: '', condition: 'Good', organization_name: '' }

export default function Assets() {
  const { isAdmin, user } = useAuth()
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const location = useLocation()

  useEffect(() => {
    if (location.search.includes('add=true') && isAdmin) {
      setShowForm(true)
    }
  }, [location, isAdmin])

  async function loadAssets() {
    setLoading(true)
    const { data } = await supabase.from('assets').select('*').order('created_at', { ascending: false })
    setAssets(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAssets()
  }, [])

  const categories = useMemo(
    () => [...new Set(assets.map((a) => a.category).filter(Boolean))],
    [assets]
  )

  const filtered = assets.filter((a) => {
    const matchesSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.asset_code.toLowerCase().includes(search.toLowerCase()) ||
      (a.location || '').toLowerCase().includes(search.toLowerCase())
    const matchesStatus = !statusFilter || a.status === statusFilter
    const matchesCategory = !categoryFilter || a.category === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
  })

  async function handleCreate(e) {
    e.preventDefault()
    setFormError('')
    setSaving(true)

    const { data: newAsset, error } = await supabase
      .from('assets')
      .insert({ ...form, created_by: user?.id })
      .select()
      .single()

    setSaving(false)
    if (error) {
      setFormError(error.code === '23505' ? 'That asset code is already in use.' : error.message)
      return
    }

    await supabase.from('asset_history').insert({
      asset_id: newAsset.id,
      action: 'Asset registered',
      actor_id: user?.id,
      details: newAsset.name,
    })

    setForm(emptyForm)
    setShowForm(false)
    loadAssets()
  }

  return (
    <PageWrapper>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">Assets</h1>
            <p className="mt-1 text-sm text-steel-500">{assets.length} registered assets</p>
          </div>
          {isAdmin && (
            <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
              {showForm ? <X size={16} /> : <Plus size={16} />}
              {showForm ? 'Cancel' : 'Register asset'}
            </button>
          )}
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="card mt-4 grid grid-cols-1 gap-4 p-5 md:grid-cols-3 overflow-hidden"
              onSubmit={handleCreate}
            >
            {formError && (
              <p className="col-span-full rounded-tag border border-red-100 bg-red-50 px-3 py-2 text-sm text-signal-rust">
                {formError}
              </p>
            )}
            <div>
              <label className="label">Asset code *</label>
              <input
                className="input"
                required
                placeholder="AST-0006"
                value={form.asset_code}
                onChange={(e) => setForm({ ...form, asset_code: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Name *</label>
              <input
                className="input"
                required
                placeholder="Classroom Projector 02"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Category</label>
              <input
                className="input"
                placeholder="Electronics"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Location</label>
              <input
                className="input"
                placeholder="Room 102"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Condition</label>
              <input
                className="input"
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Organization</label>
              <input
                className="input"
                placeholder="SMIT Campus"
                value={form.organization_name}
                onChange={(e) => setForm({ ...form, organization_name: e.target.value })}
              />
            </div>
            <div className="col-span-full">
              <button className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save asset'}
              </button>
            </div>
          </motion.form>
        )}
        </AnimatePresence>

        <div className="mt-6 flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-300" />
            <input
              className="input pl-9"
              placeholder="Search name, code, or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input max-w-[180px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="input max-w-[180px]" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <p className="text-sm text-steel-500">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-steel-500">No assets match your filters.</p>
          ) : (
            <motion.div 
              className="col-span-full grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05 }
                }
              }}
            >
              {filtered.map((asset) => (
                <motion.div
                  key={asset.id}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0 }
                  }}
                >
                  <Link
                    to={`/assets/${asset.id}`}
                    className="card block p-4 hover:shadow-lg transition-shadow duration-300 hover:-translate-y-1 h-full"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-ink">{asset.name}</p>
                        <p className="tag-mono text-steel-500">{asset.asset_code}</p>
                      </div>
                      <StatusBadge status={asset.status} kind="asset" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-steel-500">
                      {asset.category && <span>{asset.category}</span>}
                      {asset.location && <span>{asset.location}</span>}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </main>
    </PageWrapper>
  )
}
