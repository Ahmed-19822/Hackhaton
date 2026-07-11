import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Wrench, Clock, Plus } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import Navbar from '../components/Navbar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import PriorityBadge from '../components/PriorityBadge.jsx'
import PageWrapper from '../components/PageWrapper.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { motion } from 'framer-motion'

export default function Dashboard() {
  const { isAdmin } = useAuth()
  const [assets, setAssets] = useState([])
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: assetData }, { data: issueData }] = await Promise.all([
        supabase.from('assets').select('*'),
        supabase
          .from('issues')
          .select('*, assets(name, asset_code)')
          .order('created_at', { ascending: false })
          .limit(8),
      ])
      setAssets(assetData || [])
      setIssues(issueData || [])
      setLoading(false)
    }
    load()
  }, [])

  const openIssues = issues.filter((i) => !['Resolved', 'Closed'].includes(i.status))
  const criticalIssues = issues.filter((i) => i.priority === 'Critical' && i.status !== 'Closed')
  const outOfService = assets.filter((a) => a.status === 'Out of Service')
  const operational = assets.filter((a) => a.status === 'Operational')

  const cards = [
    { label: 'Total Assets', value: assets.length, icon: Wrench, color: 'text-steel-700' },
    { label: 'Operational', value: operational.length, icon: CheckCircle2, color: 'text-signal-teal' },
    { label: 'Open Issues', value: openIssues.length, icon: Clock, color: 'text-signal-amber' },
    { label: 'Critical / Out of Service', value: criticalIssues.length + outOfService.length, icon: AlertTriangle, color: 'text-signal-rust' },
  ]

  return (
    <PageWrapper>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">Operations overview</h1>
            <p className="mt-1 text-sm text-steel-500">Live summary across all registered assets.</p>
          </div>
          {isAdmin && (
            <Link to="/assets?add=true" className="btn-primary shadow-sm hover:shadow-md transition-shadow">
              <Plus size={16} />
              Add Asset
            </Link>
          )}
        </div>

        <motion.div 
          className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4"
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
          {cards.map(({ label, value, icon: Icon, color }) => (
            <motion.div 
              key={label} 
              className="card p-4 hover:shadow-lg transition-shadow duration-300 hover:-translate-y-1"
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0 }
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-steel-500">{label}</span>
                <Icon size={16} className={color} />
              </div>
              <p className="mt-2 font-mono text-2xl font-semibold text-ink">{loading ? '—' : value}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Recent issues</h2>
          <Link to="/assets" className="text-sm text-signal-teal hover:underline">
            Manage assets →
          </Link>
        </div>

        <div className="mt-3 card overflow-hidden">
          {loading ? (
            <p className="p-4 text-sm text-steel-500">Loading…</p>
          ) : issues.length === 0 ? (
            <p className="p-4 text-sm text-steel-500">No issues reported yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-steel-100 bg-steel-50 text-xs uppercase tracking-wide text-steel-500">
                <tr>
                  <th className="px-4 py-2">Issue</th>
                  <th className="px-4 py-2">Asset</th>
                  <th className="px-4 py-2">Priority</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.id} className="border-b border-steel-50 last:border-0 hover:bg-steel-50">
                    <td className="px-4 py-3">
                      <Link to={`/issues/${issue.id}`} className="font-medium text-ink hover:text-signal-teal">
                        {issue.title}
                      </Link>
                      <p className="tag-mono text-steel-500">{issue.issue_number}</p>
                    </td>
                    <td className="px-4 py-3 text-steel-700">
                      {issue.assets?.name}{' '}
                      <span className="tag-mono text-steel-500">({issue.assets?.asset_code})</span>
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={issue.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={issue.status} kind="issue" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </PageWrapper>
  )
}
