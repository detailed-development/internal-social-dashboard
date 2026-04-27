import { useTheme } from '../../ThemeContext'

function formatMetric(value) {
  if (!value) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

const METRIC_CONFIG = [
  { label: 'Reach', key: 'reach' },
  { label: 'Impressions', key: 'impressions' },
  { label: 'Profile visits', key: 'profileVisits' },
  { label: 'Followers gained', key: 'followersGained' },
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
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t ${theme.cardDivider}`}>
      {METRIC_CONFIG.map(({ label, key }) => (
        <div key={label} className={`text-center rounded-lg px-2 py-1.5 ${theme.id === 'dark' ? 'bg-gray-800/40' : 'bg-gray-50'}`}>
          <p className={`text-sm font-semibold ${theme.heading}`}>
            {formatMetric(metrics[key])}
          </p>
          <p className={`text-[11px] ${theme.muted}`}>{label}</p>
        </div>
      ))}
    </div>
  )
}
