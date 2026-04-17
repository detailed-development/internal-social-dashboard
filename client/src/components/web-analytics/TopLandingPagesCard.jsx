import { useTheme } from '../../ThemeContext'

function formatNumber(value) {
  if (!value) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

export default function TopLandingPagesCard({ pages }) {
  const { theme } = useTheme()

  if (pages.length === 0) {
    return null
  }

  return (
    <div className={`border rounded-xl p-5 ${theme.card}`}>
      <p className={`text-xs font-semibold mb-4 ${theme.subtext}`}>Top Landing Pages</p>
      <div className="space-y-2">
        {pages.slice(0, 8).map((page, index) => (
          <div key={index} className="flex items-center justify-between text-sm gap-4">
            <span className={`truncate min-w-0 flex-1 font-mono text-xs ${theme.body}`}>
              {page.path}
            </span>
            <div className="flex gap-4 flex-shrink-0">
              <span className={theme.muted}>{formatNumber(page.sessions)} sessions</span>
              <span className={theme.muted}>{formatNumber(page.pageviews)} views</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
