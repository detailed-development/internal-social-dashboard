import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Send, Settings, Sparkles, Users, Wrench } from 'lucide-react'

import { getOverview } from '../api'
import StatCard from '../components/StatCard'
import RadialOrbitalTimeline from '../components/ui/radial-orbital-timeline'
import { useTheme } from '../ThemeContext'

function clamp(value, min = 8, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value || 0)))
}

function pluralize(value, singular, plural = `${singular}s`) {
  return value === 1 ? singular : plural
}

function buildOverviewOrbit(data) {
  const activeClients = data?.activeClients || 0
  const totalPosts = data?.totalPosts || 0
  const totalEngagement = data?.totalEngagement || 0

  return [
    {
      id: 1,
      title: 'Clients',
      date: 'Live',
      content:
        activeClients > 0
          ? `${activeClients} active ${pluralize(activeClients, 'client')} currently tracked across the dashboard.`
          : 'No active clients are connected yet. Add a client to begin populating the workspace.',
      category: 'Overview',
      icon: Users,
      relatedIds: [2, 6],
      status: activeClients > 0 ? 'completed' : 'pending',
      energy: clamp(18 + activeClients * 12),
    },
    {
      id: 2,
      title: 'Publishing',
      date: '30d',
      content:
        totalPosts > 0
          ? `${totalPosts.toLocaleString()} posts were published in the last 30 days across connected accounts.`
          : 'Post volume has not populated yet for the current 30-day window.',
      category: 'Activity',
      icon: Send,
      relatedIds: [1, 3],
      status: totalPosts > 0 ? 'completed' : 'pending',
      energy: clamp(totalPosts > 0 ? 26 + Math.log10(totalPosts + 1) * 26 : 12),
    },
    {
      id: 3,
      title: 'Engagement',
      date: '30d',
      content:
        totalEngagement > 0
          ? `${totalEngagement.toLocaleString()} total engagements have been captured from likes, comments, shares, and saves.`
          : 'Engagement totals will light up once synced post metrics are available.',
      category: 'Performance',
      icon: BarChart3,
      relatedIds: [2, 4],
      status: totalEngagement > 0 ? 'in-progress' : 'pending',
      energy: clamp(totalEngagement > 0 ? 28 + Math.log10(totalEngagement + 1) * 18 : 14),
    },
    {
      id: 4,
      title: 'Insights',
      date: 'Live',
      content:
        'Client detail pages already expose deterministic analytics, charting, freshness badges, and rule-based insights.',
      category: 'Analytics',
      icon: Sparkles,
      relatedIds: [3, 5],
      status: totalPosts > 0 ? 'in-progress' : 'pending',
      energy: totalPosts > 0 ? 68 : 22,
    },
    {
      id: 5,
      title: 'AI Tools',
      date: 'Ready',
      content:
        'The dashboard includes AI-assisted captioning, writing support, and report-generation workflows alongside analytics.',
      category: 'Workspace',
      icon: Wrench,
      relatedIds: [4, 6],
      status: 'completed',
      energy: 72,
    },
    {
      id: 6,
      title: 'Admin',
      date: 'Ready',
      content:
        'Theme controls, sidebar customization, token maintenance, and workspace configuration remain available in Admin.',
      category: 'Operations',
      icon: Settings,
      relatedIds: [5, 1],
      status: 'completed',
      energy: 58,
    },
  ]
}

export default function Overview() {
  const { theme } = useTheme()
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    getOverview().then(setData).catch(() => setError(true))
  }, [])

  const timelineData = useMemo(() => buildOverviewOrbit(data), [data])

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h2 className={`text-2xl font-bold ${theme.heading}`}>Overview</h2>
        <p className={`text-sm mt-1 ${theme.subtext}`}>Last 30 days across all clients</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Active Clients" value={data?.activeClients} />
        <StatCard label="Posts Published" value={data?.totalPosts} sub="last 30 days" />
        <StatCard
          label="Total Engagement"
          value={data?.totalEngagement != null ? data.totalEngagement.toLocaleString() : undefined}
          sub="likes + comments + shares + saves"
        />
      </div>

      {data && !error && (
        <RadialOrbitalTimeline
          title="Dashboard orbit"
          description="Interactive map of the live workspace across clients, publishing, analytics, AI support, and admin controls."
          timelineData={timelineData}
        />
      )}

      {error && (
        <div className="mt-10 text-center text-red-400 text-sm">
          Could not reach the API. Make sure the backend is running.
        </div>
      )}

      {!data && !error && (
        <div className={`mt-10 text-center text-sm ${theme.muted}`}>
          Loading...
        </div>
      )}

      {data && data.activeClients === 0 && (
        <div className={`mt-10 border rounded-xl p-6 text-center ${theme.overview0ClientsBg}`}>
          <p className={`font-medium ${theme.overview0ClientsText}`}>No clients yet</p>
          <p className={`text-sm mt-1 ${theme.overview0ClientsSub}`}>
            Add a client via the API and connect their social accounts to get started.
          </p>
        </div>
      )}
    </div>
  )
}
