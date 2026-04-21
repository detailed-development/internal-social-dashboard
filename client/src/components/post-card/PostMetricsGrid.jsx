import { useTheme } from '../../ThemeContext'

function formatMetric(value) {
  if (!value) return '0'
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

const METRIC_CONFIG = [
  { label: 'Likes', key: 'likes' },
  { label: 'Comments', key: 'commentsCount' },
  { label: 'Shares', key: 'shares' },
  { label: 'Saves', key: 'saves' },
]

export default function PostMetricsGrid({ metrics }) {
  const { theme } = useTheme()

  if (!metrics) {
    return null
  }

  return (
    <div className={`grid grid-cols-4 gap-2 pt-2 border-t ${theme.cardDivider}`}>
      {METRIC_CONFIG.map(({ label, key }) => (
        <div key={label} className="text-center">
          <p className={`text-sm font-semibold ${theme.heading}`}>
            {formatMetric(metrics[key])}
          </p>
          <p className={`text-xs ${theme.muted}`}>{label}</p>
        </div>
      ))}
    </div>
  )
}
