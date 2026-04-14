import { useTheme } from '../../ThemeContext'

const SEVERITY_COLORS = {
  high:   { bg: 'bg-red-100 dark:bg-red-900/20',    text: 'text-red-700 dark:text-red-300',    dot: 'bg-red-500' },
  medium: { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  low:    { bg: 'bg-emerald-100 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
}

function InsightChip({ item }) {
  const c = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.low
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {item.message}
    </span>
  )
}

const SECTIONS = [
  { key: 'wins',            label: 'Wins',            icon: '&#9650;' },
  { key: 'risks',           label: 'Risks',           icon: '&#9660;' },
  { key: 'anomalies',       label: 'Anomalies',       icon: '&#9672;' },
  { key: 'recommendations', label: 'Recommendations', icon: '&#8594;' },
]

export default function RuleInsightsPanel({ ruleInsights }) {
  const { theme } = useTheme()
  if (!ruleInsights) return null
  const hasAny = SECTIONS.some(s => (ruleInsights[s.key] || []).length > 0)
  if (!hasAny) return null

  return (
    <div className={`border rounded-xl p-5 mb-6 ${theme.card}`}>
      <h3 className={`text-sm font-semibold mb-3 ${theme.body}`}>Insights</h3>
      <div className="space-y-3">
        {SECTIONS.map(({ key, label }) => {
          const items = ruleInsights[key] || []
          if (items.length === 0) return null
          return (
            <div key={key}>
              <p className={`text-xs font-medium uppercase tracking-wide mb-1.5 ${theme.subtext}`}>{label}</p>
              <div className="flex flex-wrap gap-2">
                {items.map((item, i) => <InsightChip key={`${item.code}-${i}`} item={item} />)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
