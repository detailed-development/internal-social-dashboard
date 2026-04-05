import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useTheme } from '../ThemeContext'

export default function EngagementChart({ data }) {
  const { theme } = useTheme()
  const c = theme.chart
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: c.tickFill }} />
        <YAxis tick={{ fontSize: 12, fill: c.tickFill }} />
        <Tooltip contentStyle={{ backgroundColor: c.tooltipBg, borderColor: c.grid }} />
        <Legend />
        <Bar dataKey="likes"  fill={c.bar1} radius={[4, 4, 0, 0]} />
        <Bar dataKey="shares" fill={c.bar2} radius={[4, 4, 0, 0]} />
        <Bar dataKey="saves"  fill={c.bar3} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
