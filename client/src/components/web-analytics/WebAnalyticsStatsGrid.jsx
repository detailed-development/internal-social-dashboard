import { useTheme } from '../../ThemeContext'

export default function WebAnalyticsStatsGrid({ stats }) {
  const { theme } = useTheme()

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
