const ASSET_STATUS_COLORS = {
  Operational: 'bg-signal-teal',
  'Issue Reported': 'bg-signal-amber',
  'Under Inspection': 'bg-signal-amber',
  'Under Maintenance': 'bg-signal-amber',
  'Out of Service': 'bg-signal-rust',
  Retired: 'bg-signal-slate',
}

const ISSUE_STATUS_COLORS = {
  Reported: 'bg-signal-amber',
  Assigned: 'bg-signal-amber',
  'Inspection Started': 'bg-steel-500',
  'Maintenance In Progress': 'bg-steel-500',
  'Waiting for Parts': 'bg-signal-rust',
  Resolved: 'bg-signal-teal',
  Closed: 'bg-signal-slate',
  Reopened: 'bg-signal-rust',
}

export default function StatusBadge({ status, kind = 'asset' }) {
  const colors = kind === 'asset' ? ASSET_STATUS_COLORS : ISSUE_STATUS_COLORS
  const dot = colors[status] || 'bg-steel-300'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-steel-700">
      <span className={`status-dot ${dot}`} />
      {status}
    </span>
  )
}
