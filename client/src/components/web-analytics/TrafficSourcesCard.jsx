import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useTheme } from '../../ThemeContext'

export default function TrafficSourcesCard({ sourceData }) {
  const { theme } = useTheme()
  const c = theme.chart

  if (sourceData.length === 0) {
    return null
  }

  return (
    <div className={`border rounded-xl p-5 ${theme.card}`}>
      <p className={`text-xs font-semibold mb-4 ${theme.subtext}`}>Traffic Sources</p>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={sourceData.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
          <XAxis type="number" tick={{ fontSize: 11, fill: c.tickFill }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: c.tickFill }} width={120} />
          <Tooltip contentStyle={{ backgroundColor: c.tooltipBg, borderColor: c.grid }} />
          <Bar dataKey="sessions" fill={c.sources} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
