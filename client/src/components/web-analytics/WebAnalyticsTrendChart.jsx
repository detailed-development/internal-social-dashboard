import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTheme } from '../../ThemeContext'

export default function WebAnalyticsTrendChart({ chartData }) {
  const { theme } = useTheme()
  const c = theme.chart

  return (
    <div className={`border rounded-xl p-5 ${theme.card}`}>
      <p className={`text-xs font-semibold mb-4 ${theme.subtext}`}>Daily Traffic</p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: c.tickFill }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: c.tickFill }} />
          <Tooltip contentStyle={{ backgroundColor: c.tooltipBg, borderColor: c.grid }} />
          <Legend />
          <Line type="monotone" dataKey="Sessions" stroke={c.line1} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Users" stroke={c.line2} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Pageviews" stroke={c.line3} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
