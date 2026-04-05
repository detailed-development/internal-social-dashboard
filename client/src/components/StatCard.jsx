import { useTheme } from '../ThemeContext'

export default function StatCard({ label, value, sub }) {
  const { theme } = useTheme()
  return (
    <div className={`rounded-xl border p-5 ${theme.card}`}>
      <p className={`text-sm ${theme.subtext}`}>{label}</p>
      <p className={`text-3xl font-bold mt-1 ${theme.heading}`}>{value ?? '—'}</p>
      {sub && <p className={`text-xs mt-1 ${theme.muted}`}>{sub}</p>}
    </div>
  )
}
