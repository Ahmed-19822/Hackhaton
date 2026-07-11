const COLORS = {
  Low: 'bg-steel-50 text-steel-500 border-steel-100',
  Medium: 'bg-steel-50 text-steel-700 border-steel-100',
  High: 'bg-orange-50 text-signal-amber border-orange-100',
  Critical: 'bg-red-50 text-signal-rust border-red-100',
}

export default function PriorityBadge({ priority }) {
  return (
    <span
      className={`tag-mono inline-flex items-center rounded-tag border px-2 py-0.5 uppercase ${
        COLORS[priority] || COLORS.Medium
      }`}
    >
      {priority}
    </span>
  )
}
