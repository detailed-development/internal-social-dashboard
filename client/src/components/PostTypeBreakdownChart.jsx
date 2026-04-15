import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useTheme } from '../ThemeContext'

const TYPE_LABELS = {
  POST: 'Static',
  CAROUSEL: 'Carousel',
  REEL: 'Reel',
  STORY: 'Story',
  VIDEO: 'Video',
  SHORT: 'Short',
  TWEET: 'Tweet',
}

// Platform colors (intentionally fixed — not theme-driven since these are brand colors)
const PLATFORM_COLORS = {
  INSTAGRAM: '#e1306c',
  FACEBOOK: '#1877f2',
  TIKTOK: '#010101',
  YOUTUBE: '#ff0000',
  TWITTER: '#1da1f2',
}

export default function PostTypeBreakdownChart({ postTypeBreakdown = [] }) {
  const { theme } = useTheme()
  const c = theme.chart

  if (!postTypeBreakdown || postTypeBreakdown.length === 0) return null

  // Collect unique post types and platforms
  const typeSet = new Set()
  const platformSet = new Set()
  for (const row of postTypeBreakdown) {
    typeSet.add(row.type)
    platformSet.add(row.platform)
  }

  // Build chart data: one entry per type, one key per platform
  const chartData = [...typeSet].map((type) => {
    const entry = { type: TYPE_LABELS[type] || type }
    for (const platform of platformSet) {
      const match = postTypeBreakdown.find((r) => r.type === type && r.platform === platform)
      entry[platform] = match ? match.avgEngagement : 0
    }
    return entry
  })

  const platforms = [...platformSet]

  return (
    <div>
      <h4 className={`text-sm font-semibold mb-3 ${theme.heading}`}>Avg Engagement by Post Type</h4>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
          <XAxis dataKey="type" tick={{ fontSize: 12, fill: c.tickFill }} />
          <YAxis tick={{ fontSize: 12, fill: c.tickFill }} />
          <Tooltip
            contentStyle={{ backgroundColor: c.tooltipBg, borderColor: c.grid }}
            formatter={(value) => [value.toLocaleString(), undefined]}
          />
          <Legend />
          {platforms.map((platform) => (
            <Bar
              key={platform}
              dataKey={platform}
              name={platform.charAt(0) + platform.slice(1).toLowerCase()}
              fill={PLATFORM_COLORS[platform] || c.bar1}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
