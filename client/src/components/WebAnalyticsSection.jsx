import { useMemo } from 'react'
import { useTheme } from '../ThemeContext'
import WebAnalyticsStatsGrid from './web-analytics/WebAnalyticsStatsGrid'
import WebAnalyticsTrendChart from './web-analytics/WebAnalyticsTrendChart'
import DeviceBreakdownCard from './web-analytics/DeviceBreakdownCard'
import TrafficSourcesCard from './web-analytics/TrafficSourcesCard'
import TopLandingPagesCard from './web-analytics/TopLandingPagesCard'

function formatNumber(value) {
  if (!value) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

function formatDuration(seconds) {
  if (!seconds) return '0s'
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.round(seconds % 60)
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export default function WebAnalyticsSection({ data }) {
  const { theme } = useTheme()

  const derived = useMemo(() => {
    if (!data?.daily?.length) {
      return null
    }

    const { totals, daily, sources = [], devices = [], pages = [] } = data

    const stats = [
      { label: 'Sessions', value: formatNumber(totals.sessions) },
      { label: 'Users', value: formatNumber(totals.users) },
      { label: 'New Users', value: formatNumber(totals.newUsers) },
      { label: 'Pageviews', value: formatNumber(totals.pageviews) },
      {
        label: 'Engagement Rate',
        value: totals.engagementRate != null ? `${(totals.engagementRate * 100).toFixed(1)}%` : '—',
      },
      {
        label: 'Avg Bounce Rate',
        value: totals.avgBounceRate != null ? `${(totals.avgBounceRate * 100).toFixed(1)}%` : '—',
      },
      { label: 'Avg Session', value: formatDuration(totals.avgSessionDuration) },
      {
        label: 'Pages / Session',
        value: totals.sessions ? (totals.pageviews / totals.sessions).toFixed(1) : '—',
      },
    ]

    const chartData = daily.map((row) => ({
      date: formatDate(row.date),
      Sessions: row.sessions,
      Users: row.users,
      Pageviews: row.pageviews,
    }))

    const sourceData = sources.map((source) => ({
      name: `${source.source} / ${source.medium}`,
      sessions: source.sessions,
      users: source.users,
    }))

    const deviceData = devices.map((device) => ({
      name: device.device.charAt(0).toUpperCase() + device.device.slice(1),
      sessions: device.sessions,
      users: device.users,
    }))

    const totalDeviceSessions = deviceData.reduce((sum, device) => sum + device.sessions, 0)

    return {
      stats,
      chartData,
      sourceData,
      deviceData,
      totalDeviceSessions,
      pages,
    }
  }, [data])

  if (!data?.gaPropertyId) {
    return (
      <div className={`border rounded-xl p-6 text-center text-sm ${theme.emptyStateBg}`}>
        No GA4 property linked for this client.
      </div>
    )
  }

  if (!data.daily?.length || !derived) {
    return (
      <div className={`border rounded-xl p-6 text-center text-sm ${theme.emptyStateBg}`}>
        GA4 property linked ({data.gaPropertyId}) — waiting for first sync.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-semibold ${theme.body}`}>Website Analytics (Last 30 Days)</h3>
        {data.websiteUrl && (
          <a
            href={data.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className={`text-xs hover:underline ${theme.detailsLink}`}
          >
            {data.websiteUrl.replace('https://', '')}
          </a>
        )}
      </div>

      <WebAnalyticsStatsGrid stats={derived.stats} />
      <WebAnalyticsTrendChart chartData={derived.chartData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DeviceBreakdownCard
          deviceData={derived.deviceData}
          totalDeviceSessions={derived.totalDeviceSessions}
        />
        <TrafficSourcesCard sourceData={derived.sourceData} />
      </div>

      <TopLandingPagesCard pages={derived.pages} />
    </div>
  )
}
