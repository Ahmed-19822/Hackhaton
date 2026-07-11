// Lightweight, rule-based "AI Issue Triage" for Track B.
//
// The hackathon brief allows a rule-based classifier when a trainer hasn't
// covered secure AI API integration yet. This runs entirely client-side —
// no API key required, nothing to leak.
//
// If you DO want real GenAI, swap the body of `triageComplaint` for a call to
// a Supabase Edge Function (keep the AI provider key server-side there, never
// in this frontend). The return shape below is what the rest of the app expects.

const RULES = [
  {
    keywords: ['leak', 'leaking', 'water', 'drip'],
    category: 'Leakage / Plumbing',
    priority: 'High',
    causes: ['Blocked drain pipe', 'Loose fitting or seal', 'Condensation buildup'],
    checks: ['Turn off power near any water contact', 'Inspect drainage path', 'Check for visible pooling'],
  },
  {
    keywords: ['noise', 'sound', 'rattle', 'vibrat'],
    category: 'Mechanical',
    priority: 'Medium',
    causes: ['Loose component', 'Worn bearing', 'Debris in mechanism'],
    checks: ['Listen to isolate the noise source', 'Check for loose panels or parts'],
  },
  {
    keywords: ['flicker', 'display', 'screen', 'hdmi', 'no signal', 'not detect'],
    category: 'Electronics / Display',
    priority: 'Medium',
    causes: ['Damaged cable', 'Loose connection', 'Failing display unit'],
    checks: ['Reseat cable connections', 'Test with an alternate cable', 'Check power supply'],
  },
  {
    keywords: ['spark', 'smoke', 'burning smell', 'shock', 'fire'],
    category: 'Electrical Safety',
    priority: 'Critical',
    causes: ['Exposed wiring', 'Overloaded circuit', 'Component failure'],
    checks: ['Disconnect power immediately', 'Do not operate the asset', 'Evacuate area if smoke is present'],
  },
  {
    keywords: ['cool', 'cooling', 'hot', 'temperature', 'ac ', 'air condition'],
    category: 'HVAC / Cooling',
    priority: 'High',
    causes: ['Dirty filter', 'Refrigerant leak', 'Frozen coil'],
    checks: ['Check filter condition', 'Inspect for ice buildup', 'Confirm thermostat setting'],
  },
  {
    keywords: ['slow', 'lag', 'freeze', 'crash', 'network', 'server'],
    category: 'IT / Network',
    priority: 'Medium',
    causes: ['Software fault', 'Overheating hardware', 'Network congestion'],
    checks: ['Restart the device', 'Check cable/network connectivity', 'Review recent error logs'],
  },
  {
    keywords: ['stuck', 'jam', 'wont open', "won't open", 'door', 'elevator'],
    category: 'Mechanical / Access',
    priority: 'High',
    causes: ['Mechanical jam', 'Sensor misalignment', 'Power interruption'],
    checks: ['Do not force the mechanism', 'Check for obstruction', 'Verify power supply'],
  },
]

const DEFAULT_RULE = {
  category: 'General Maintenance',
  priority: 'Medium',
  causes: ['Normal wear and tear', 'Requires on-site inspection to confirm'],
  checks: ['Visually inspect the asset', 'Confirm the asset is safe to keep in use'],
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
}

/**
 * Convert a natural-language complaint into structured triage output.
 * @param {string} complaint - free text from the reporter
 * @param {{ assetName?: string, assetCategory?: string }} context
 */
export function triageComplaint(complaint, context = {}) {
  const text = (complaint || '').toLowerCase()
  const matched = RULES.find((rule) => rule.keywords.some((kw) => text.includes(kw))) || DEFAULT_RULE

  const shortSummary = complaint.trim().split(/[.!\n]/)[0]
  const title = shortSummary
    ? toTitleCase(shortSummary.slice(0, 70))
    : `${context.assetName || 'Asset'} issue reported`

  return {
    title,
    category: matched.category,
    priority: matched.priority,
    possible_causes: matched.causes,
    initial_checks: matched.checks,
    recurring_pattern_warning:
      matched.priority === 'Critical'
        ? 'Safety-related — recommend a qualified technician inspect before the asset is used again.'
        : null,
    source: 'rule-based-triage-v1',
  }
}
