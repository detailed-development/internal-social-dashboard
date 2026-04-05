import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, BarChart, Bar,
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

  const { totals, daily, sources } = data

  const chartData = daily.map(row => ({
    date:      fmtDate(row.date),
    Sessions:  row.sessions,
    Users:     row.users,
    Pageviews: row.pageviews,
  }))

  const sourceData = sources.map(s => ({
    name:     `${s.source} / ${s.medium}`,
    sessions: s.sessions,
    users:    s.users,
  }))

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
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sessions',         value: fmt(totals.sessions) },
          { label: 'Users',            value: fmt(totals.users) },
          { label: 'New Users',        value: fmt(totals.newUsers) },
          { label: 'Pageviews',        value: fmt(totals.pageviews) },
          { label: 'Avg Bounce Rate',  value: totals.avgBounceRate != null ? (totals.avgBounceRate * 100).toFixed(1) + '%' : '—' },
          { label: 'Avg Session',      value: fmtDuration(totals.avgSessionDuration) },
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

      {/* Traffic sources */}
      {sourceData.length > 0 && (
        <div className={`border rounded-xl p-5 ${theme.card}`}>
          <p className={`text-xs font-semibold mb-4 ${theme.subtext}`}>Traffic Sources</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sourceData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
              <XAxis type="number" tick={{ fontSize: 11, fill: c.tickFill }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: c.tickFill }} width={140} />
              <Tooltip contentStyle={{ backgroundColor: c.tooltipBg, borderColor: c.grid }} />
              <Bar dataKey="sessions" fill={c.sources} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
