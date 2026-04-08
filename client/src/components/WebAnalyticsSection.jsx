import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'
import { useTheme } from '../ThemeContext'

function fmt(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function fmtDuration(seconds) {
  if (!seconds) return '0s'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function fmtDate(dateStr) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const DEVICE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444']

export default function WebAnalyticsSection({ data }) {
  const { theme } = useTheme()
  const c = theme.chart

  if (!data?.gaPropertyId) {
    return (
      <div className={`border rounded-xl p-6 text-center text-sm ${theme.emptyStateBg}`}>
        No GA4 property linked for this client.
      </div>
    )
  }

  if (!data.daily?.length) {
    return (
      <div className={`border rounded-xl p-6 text-center text-sm ${theme.emptyStateBg}`}>
        GA4 property linked ({data.gaPropertyId}) — waiting for first sync.
      </div>
    )
  }

  const { totals, daily, sources, devices = [], pages = [] } = data

  const chartData = daily.map(row => ({
    date:      fmtDate(row.date),
    Sessions:  row.sessions,
    Users:     row.users,
    Pageviews: row.pageviews,
  }))

  const sourceData = (sources || []).map(s => ({
    name:     `${s.source} / ${s.medium}`,
    sessions: s.sessions,
    users:    s.users,
  }))

  const deviceData = devices.map(d => ({
    name: d.device.charAt(0).toUpperCase() + d.device.slice(1),
    sessions: d.sessions,
    users: d.users,
  }))

  const totalDeviceSessions = deviceData.reduce((s, d) => s + d.sessions, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Sessions',         value: fmt(totals.sessions) },
          { label: 'Users',            value: fmt(totals.users) },
          { label: 'New Users',        value: fmt(totals.newUsers) },
          { label: 'Pageviews',        value: fmt(totals.pageviews) },
          { label: 'Engagement Rate',  value: totals.engagementRate != null ? (totals.engagementRate * 100).toFixed(1) + '%' : '—' },
          { label: 'Avg Bounce Rate',  value: totals.avgBounceRate != null ? (totals.avgBounceRate * 100).toFixed(1) + '%' : '—' },
          { label: 'Avg Session',      value: fmtDuration(totals.avgSessionDuration) },
          { label: 'Pages / Session',  value: totals.sessions ? (totals.pageviews / totals.sessions).toFixed(1) : '—' },
        ].map(({ label, value }) => (
          <div key={label} className={`border rounded-xl p-4 ${theme.card}`}>
            <p className={`text-xs ${theme.muted}`}>{label}</p>
            <p className={`text-2xl font-bold mt-1 ${theme.heading}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Daily trend chart */}
      <div className={`border rounded-xl p-5 ${theme.card}`}>
        <p className={`text-xs font-semibold mb-4 ${theme.subtext}`}>Daily Traffic</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: c.tickFill }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: c.tickFill }} />
            <Tooltip contentStyle={{ backgroundColor: c.tooltipBg, borderColor: c.grid }} />
            <Legend />
            <Line type="monotone" dataKey="Sessions"  stroke={c.line1} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Users"     stroke={c.line2} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Pageviews" stroke={c.line3} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Device + Sources side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Device breakdown */}
        {deviceData.length > 0 && (
          <div className={`border rounded-xl p-5 ${theme.card}`}>
            <p className={`text-xs font-semibold mb-4 ${theme.subtext}`}>Device Breakdown</p>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={deviceData} dataKey="sessions" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2}>
                    {deviceData.map((_, i) => <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: c.tooltipBg, borderColor: c.grid }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {deviceData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: DEVICE_COLORS[i % DEVICE_COLORS.length] }} />
                      <span className={theme.body}>{d.name}</span>
                    </div>
                    <span className={`font-semibold ${theme.heading}`}>
                      {totalDeviceSessions ? ((d.sessions / totalDeviceSessions) * 100).toFixed(0) + '%' : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Traffic sources */}
        {sourceData.length > 0 && (
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
        )}
      </div>

      {/* Top landing pages */}
      {pages.length > 0 && (
        <div className={`border rounded-xl p-5 ${theme.card}`}>
          <p className={`text-xs font-semibold mb-4 ${theme.subtext}`}>Top Landing Pages</p>
          <div className="space-y-2">
            {pages.slice(0, 8).map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm gap-4">
                <span className={`truncate min-w-0 flex-1 font-mono text-xs ${theme.body}`}>{p.path}</span>
                <div className="flex gap-4 flex-shrink-0">
                  <span className={theme.muted}>{fmt(p.sessions)} sessions</span>
                  <span className={theme.muted}>{fmt(p.pageviews)} views</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
