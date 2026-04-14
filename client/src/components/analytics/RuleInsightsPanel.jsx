import { useTheme } from '../../ThemeContext'

const SEVERITY_TO_STATUS = {
  high: 'stale',
  medium: 'aging',
  low: 'fresh',
}

const SECTIONS = [
  { key: 'wins', label: 'Wins', icon: '▲' },
  { key: 'risks', label: 'Risks', icon: '▼' },
  { key: 'anomalies', label: 'Anomalies', icon: '◆' },
  { key: 'recommendations', label: 'Recommendations', icon: '→' },
]

function getStatusTone(theme, state) {
  return theme.status?.[state] || theme.status?.unknown || {
    pill: 'bg-gray-100 text-gray-600 border border-gray-200',
    dot: 'bg-gray-400',
  }
}

function InsightChip({ item, theme }) {
  const state = SEVERITY_TO_STATUS[item.severity] || 'unknown'
  const tone = getStatusTone(theme, state)

  return (
    <span
      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-medium border ${tone.pill}`}
      title={item.code || ''}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
      {item.message}
    </span>
  )
}

export default function RuleInsightsPanel({ ruleInsights }) {
  const { theme } = useTheme()
  if (!ruleInsights) return null

  const hasAny = SECTIONS.some((s) => (ruleInsights[s.key] || []).length > 0)
  if (!hasAny) return null

  return (
    <div className={`border rounded-xl p-5 mb-6 shadow-sm ${theme.card}`}>
      <h3 className={`text-sm font-semibold mb-4 ${theme.heading}`}>Insights</h3>

      <div className="space-y-3">
        {SECTIONS.map(({ key, label, icon }) => {
          const items = ruleInsights[key] || []
          if (items.length === 0) return null

          return (
            <div
              key={key}
              className={`rounded-lg border p-3 ${theme.surfaceMuted || ''} ${theme.dividerSoft || theme.cardDivider}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs ${theme.subtext}`}>{icon}</span>
                <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${theme.subtext}`}>
                  {label}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {items.map((item, i) => (
                  <InsightChip key={`${item.code || key}-${i}`} item={item} theme={theme} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
