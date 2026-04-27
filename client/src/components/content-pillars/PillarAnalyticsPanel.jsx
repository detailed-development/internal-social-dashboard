import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useTheme } from '../../ThemeContext'

const METRIC_OPTIONS = [
  { key: 'reach', label: 'Reach' },
  { key: 'impressions', label: 'Impressions' },
  { key: 'profileVisits', label: 'Profile visits' },
  { key: 'followersGained', label: 'Followers gained' },
  { key: 'shares', label: 'Shares' },
  { key: 'saves', label: 'Saves' },
  { key: 'comments', label: 'Comments' },
  { key: 'likes', label: 'Likes' },
  { key: 'posts', label: 'Post count' },
  { key: 'avgDaysBetweenPosts', label: 'Avg days between posts' },
]

const INTENT_PATTERNS = {
  questions: /\?|\b(how|what|where|when|why|who|can i|could i|do you|does this|is this)\b/i,
  compliments: /\b(love|amazing|great|beautiful|awesome|excellent|perfect|obsessed|congrats|congratulations)\b/i,
  objections: /\b(but|however|expensive|too much|concern|worried|problem|issue|not sure|confused|doesn't|dont|don't)\b/i,
  purchaseSignals: /\b(price|pricing|cost|book|booking|buy|purchase|order|available|availability|schedule|appointment|quote|dm me|link)\b/i,
}

function formatNumber(value) {
  if (value == null) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(1)
}

function metricValue(metrics, key) {
  if (!metrics) return 0
  if (key === 'comments') return metrics.commentsCount || 0
  return metrics[key] || 0
}

function getPostPillarIds(post) {
  return (post.pillars || []).map((assignment) => assignment.contentPillarId).filter(Boolean)
}

function classifyComments(comments = []) {
  const result = { questions: 0, compliments: 0, objections: 0, purchaseSignals: 0 }
  for (const comment of comments) {
    const body = comment.body || ''
    for (const [key, pattern] of Object.entries(INTENT_PATTERNS)) {
      if (pattern.test(body)) result[key] += 1
    }
  }
  return result
}

function averageDaysBetween(dates) {
  if (dates.length < 2) return null
  const sorted = [...dates].map((d) => new Date(d).getTime()).sort((a, b) => a - b)
  let totalDays = 0
  for (let i = 1; i < sorted.length; i += 1) {
    totalDays += (sorted[i] - sorted[i - 1]) / 86_400_000
  }
  return totalDays / (sorted.length - 1)
}

function hourBucket(date) {
  const hour = new Date(date).getHours()
  if (hour < 6) return 'Overnight'
  if (hour < 12) return 'Morning'
  if (hour < 17) return 'Afternoon'
  return 'Evening'
}

function buildPillarAnalytics(pillars, posts) {
  const rows = pillars.map((pillar) => ({
    id: pillar.id,
    name: pillar.name,
    color: pillar.color || '#6366f1',
    posts: 0,
    reach: 0,
    impressions: 0,
    profileVisits: 0,
    followersGained: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    engagement: 0,
    actionScore: 0,
    trustScore: 0,
    audienceGrowthScore: 0,
    questions: 0,
    compliments: 0,
    objections: 0,
    purchaseSignals: 0,
    dates: [],
    byType: {},
    byDay: {},
    byTime: {},
  }))

  const byId = Object.fromEntries(rows.map((row) => [row.id, row]))

  for (const post of posts) {
    const metrics = post.metrics?.[0] || {}
    const postEngagement = metricValue(metrics, 'likes') + metricValue(metrics, 'comments') + metricValue(metrics, 'shares') + metricValue(metrics, 'saves')
    const intents = classifyComments(post.comments)
    const mediaType = post.mediaType || 'POST'
    const day = new Date(post.publishedAt).toLocaleDateString(undefined, { weekday: 'short' })
    const time = hourBucket(post.publishedAt)

    for (const pillarId of getPostPillarIds(post)) {
      const row = byId[pillarId]
      if (!row) continue

      row.posts += 1
      row.dates.push(post.publishedAt)
      row.reach += metricValue(metrics, 'reach')
      row.impressions += metricValue(metrics, 'impressions')
      row.profileVisits += metricValue(metrics, 'profileVisits')
      row.followersGained += metricValue(metrics, 'followersGained')
      row.likes += metricValue(metrics, 'likes')
      row.comments += metricValue(metrics, 'comments')
      row.shares += metricValue(metrics, 'shares')
      row.saves += metricValue(metrics, 'saves')
      row.engagement += postEngagement
      row.actionScore += metricValue(metrics, 'shares') + metricValue(metrics, 'saves') + metricValue(metrics, 'profileVisits') + intents.purchaseSignals
      row.trustScore += metricValue(metrics, 'comments') + metricValue(metrics, 'saves') + intents.questions + intents.compliments
      row.audienceGrowthScore += metricValue(metrics, 'reach') + metricValue(metrics, 'impressions') + metricValue(metrics, 'followersGained')

      for (const key of Object.keys(intents)) row[key] += intents[key]

      row.byType[mediaType] ||= { posts: 0, engagement: 0, reach: 0 }
      row.byType[mediaType].posts += 1
      row.byType[mediaType].engagement += postEngagement
      row.byType[mediaType].reach += metricValue(metrics, 'reach')

      row.byDay[day] ||= { posts: 0, engagement: 0, reach: 0 }
      row.byDay[day].posts += 1
      row.byDay[day].engagement += postEngagement
      row.byDay[day].reach += metricValue(metrics, 'reach')

      row.byTime[time] ||= { posts: 0, engagement: 0, reach: 0 }
      row.byTime[time].posts += 1
      row.byTime[time].engagement += postEngagement
      row.byTime[time].reach += metricValue(metrics, 'reach')
    }
  }

  return rows.map((row) => ({
    ...row,
    avgEngagement: row.posts ? row.engagement / row.posts : 0,
    avgReach: row.posts ? row.reach / row.posts : 0,
    avgDaysBetweenPosts: averageDaysBetween(row.dates) ?? 0,
  }))
}

function topBy(rows, key) {
  return [...rows].filter((row) => row.posts > 0).sort((a, b) => b[key] - a[key])[0]
}

function bottomDoingNothing(rows) {
  return [...rows]
    .filter((row) => row.posts > 0)
    .sort((a, b) => (a.engagement + a.reach) - (b.engagement + b.reach))[0]
}

function strongestBreakdown(row, bucketKey) {
  if (!row) return null
  const entries = Object.entries(row[bucketKey] || {})
  if (!entries.length) return null
  const [name, stats] = entries.sort((a, b) => (b[1].engagement + b[1].reach) - (a[1].engagement + a[1].reach))[0]
  return { name, ...stats }
}

export default function PillarAnalyticsPanel({ pillars, posts }) {
  const { theme } = useTheme()
  const [metricKey, setMetricKey] = useState('reach')
  const [isOpen, setIsOpen] = useState(true)

  const analytics = useMemo(() => buildPillarAnalytics(pillars, posts), [pillars, posts])
  const activeRows = analytics.filter((row) => row.posts > 0)
  const selectedMetric = METRIC_OPTIONS.find((metric) => metric.key === metricKey) || METRIC_OPTIONS[0]

  if (pillars.length === 0) return null

  const growth = topBy(activeRows, 'audienceGrowthScore')
  const trust = topBy(activeRows, 'trustScore')
  const action = topBy(activeRows, 'actionScore')
  const inactive = bottomDoingNothing(activeRows)
  const strongestType = strongestBreakdown(growth, 'byType')
  const strongestDay = strongestBreakdown(growth, 'byDay')
  const strongestTime = strongestBreakdown(growth, 'byTime')

  return (
    <div className={`rounded-xl border overflow-hidden ${theme.card}`}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:opacity-80"
        aria-expanded={isOpen}
      >
        <div>
          <p className={`text-sm font-semibold ${theme.heading}`}>Pillar comparison</p>
          <p className={`text-xs ${theme.muted}`}>Compare pillars by reach, action, trust, growth, velocity, and engagement.</p>
        </div>
        <svg
          className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? '' : '-rotate-90'} ${theme.muted}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className={`border-t px-5 py-4 space-y-4 ${theme.cardDivider}`}>
          <div className={`rounded-xl border p-4 ${theme.id === 'dark' ? 'border-gray-600 bg-gray-800/40' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <p className={`text-sm font-semibold ${theme.heading}`}>{selectedMetric.label} by pillar</p>
                <p className={`text-xs ${theme.muted}`}>Switch the metric to compare Pillar A vs. Pillar B vs. Pillar C.</p>
              </div>
              <select
                value={metricKey}
                onChange={(event) => setMetricKey(event.target.value)}
                className={`text-sm rounded-lg px-3 py-1.5 ${theme.input}`}
              >
                {METRIC_OPTIONS.map((metric) => (
                  <option key={metric.key} value={metric.key}>{metric.label}</option>
                ))}
              </select>
            </div>

            {activeRows.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={activeRows} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.chart.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.chart.tickFill }} />
                  <YAxis tick={{ fontSize: 11, fill: theme.chart.tickFill }} />
                  <Tooltip
                    formatter={(value) => [formatNumber(value), selectedMetric.label]}
                    contentStyle={{ backgroundColor: theme.chart.tooltipBg, borderColor: theme.chart.grid }}
                  />
                  <Bar dataKey={metricKey} name={selectedMetric.label} fill={theme.chart.bar1} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className={`text-xs ${theme.muted}`}>Assign posts to pillars to populate comparison analytics.</p>
            )}
          </div>

          {activeRows.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  title: 'Growing the audience',
                  row: growth,
                  detail: growth ? `${formatNumber(growth.reach)} reach · ${formatNumber(growth.impressions)} impressions · ${formatNumber(growth.followersGained)} followers gained` : 'No signal yet',
                },
                {
                  title: 'Deepening trust',
                  row: trust,
                  detail: trust ? `${formatNumber(trust.comments)} comments · ${formatNumber(trust.saves)} saves · ${formatNumber(trust.questions + trust.compliments)} relationship comments` : 'No signal yet',
                },
                {
                  title: 'Driving action',
                  row: action,
                  detail: action ? `${formatNumber(action.shares)} shares · ${formatNumber(action.profileVisits)} profile visits · ${formatNumber(action.purchaseSignals)} purchase signals` : 'No signal yet',
                },
                {
                  title: 'Doing nothing',
                  row: inactive,
                  detail: inactive ? `${formatNumber(inactive.engagement)} engagement · ${formatNumber(inactive.reach)} reach across ${inactive.posts} posts` : 'No signal yet',
                },
              ].map((card) => (
                <div key={card.title} className={`rounded-xl border p-4 ${theme.card}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${theme.subtext}`}>{card.title}</p>
                  <p className={`mt-1 text-base font-semibold ${theme.heading}`}>{card.row?.name || 'Not enough data'}</p>
                  <p className={`mt-1 text-xs ${theme.muted}`}>{card.detail}</p>
                </div>
              ))}
            </div>
          )}

          {activeRows.length > 0 && (
            <div className={`rounded-xl border p-4 ${theme.card}`}>
              <p className={`text-sm font-semibold mb-2 ${theme.heading}`}>Content velocity + timing read</p>
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 text-xs ${theme.body}`}>
                <div>
                  <p className={`font-semibold ${theme.subtext}`}>Strongest content type</p>
                  <p>{strongestType ? `${strongestType.name}: ${formatNumber(strongestType.engagement)} engagement from ${strongestType.posts} posts` : 'Not enough tagged posts yet.'}</p>
                </div>
                <div>
                  <p className={`font-semibold ${theme.subtext}`}>Best day signal</p>
                  <p>{strongestDay ? `${strongestDay.name}: ${formatNumber(strongestDay.reach)} reach and ${formatNumber(strongestDay.engagement)} engagement` : 'Not enough tagged posts yet.'}</p>
                </div>
                <div>
                  <p className={`font-semibold ${theme.subtext}`}>Best time window</p>
                  <p>{strongestTime ? `${strongestTime.name}: ${formatNumber(strongestTime.reach)} reach and ${formatNumber(strongestTime.engagement)} engagement` : 'Not enough tagged posts yet.'}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeRows.map((row) => (
                  <span key={row.id} className={`text-xs px-2 py-1 rounded-full ${theme.code} ${theme.muted}`}>
                    {row.name}: {row.avgDaysBetweenPosts ? `${row.avgDaysBetweenPosts.toFixed(1)} days/post` : 'single post'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
