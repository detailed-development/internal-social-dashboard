import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useTheme } from '../ThemeContext'

// Fixed per-platform line colors (brand colors, consistent across themes)
const PLATFORM_COLORS = {
  instagram: '#e1306c',
  facebook: '#1877f2',
  tiktok: '#010101',
  youtube: '#ff0000',
  twitter: '#1da1f2',
}

function shortDate(isoDate) {
  const d = new Date(isoDate)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function EngagementTrendChart({ dailyEngagement = [] }) {
  const { theme } = useTheme()
  const c = theme.chart

  if (!dailyEngagement || dailyEngagement.length === 0) return null

  // Detect platforms from keys like "instagram_likes", "facebook_likes"
  const platformSet = new Set()
  for (const row of dailyEngagement) {
    for (const key of Object.keys(row)) {
      if (key.endsWith('_likes')) platformSet.add(key.replace('_likes', ''))
    }
  }
  const platforms = [...platformSet]

  // Build chart data: one row per day, one key per platform (total engagement = likes + comments)
  const chartData = dailyEngagement.map((row) => {
    const entry = { date: shortDate(row.date) }
    for (const p of platforms) {
      entry[p] = (row[`${p}_likes`] || 0) + (row[`${p}_comments`] || 0)
    }
    return entry
  })

  return (
    <div>
      <h4 className={`text-sm font-semibold mb-3 ${theme.heading}`}>Daily Engagement Trend</h4>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: c.tickFill }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 11, fill: c.tickFill }} />
          <Tooltip contentStyle={{ backgroundColor: c.tooltipBg, borderColor: c.grid }} />
          <Legend />
          {platforms.map((platform) => (
            <Line
              key={platform}
              type="monotone"
              dataKey={platform}
              name={platform.charAt(0).toUpperCase() + platform.slice(1)}
              stroke={PLATFORM_COLORS[platform] || c.bar1}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
