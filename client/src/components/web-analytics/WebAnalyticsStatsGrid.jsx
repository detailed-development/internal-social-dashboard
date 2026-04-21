import { useTheme } from '../../ThemeContext'

export default function WebAnalyticsStatsGrid({ stats, compact = false }) {
  const { theme } = useTheme()

  if (compact) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className={`rounded-lg border px-3 py-3 ${theme.surfaceMuted} ${theme.cardDivider}`}
          >
            <p className={`text-[11px] uppercase tracking-[0.16em] ${theme.muted}`}>{label}</p>
            <p className={`text-lg sm:text-xl font-semibold mt-1 ${theme.heading}`}>{value}</p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {stats.map(({ label, value }) => (
        <div key={label} className={`border rounded-xl p-4 ${theme.card}`}>
          <p className={`text-xs ${theme.muted}`}>{label}</p>
          <p className={`text-2xl font-bold mt-1 ${theme.heading}`}>{value}</p>
        </div>
      ))}
    </div>
  )
}
