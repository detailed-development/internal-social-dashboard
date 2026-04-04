import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, BarChart, Bar,
} from 'recharts'

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
  if (!data?.gaPropertyId) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
        No GA4 property linked for this client.
      </div>
    )
  }

  if (!data.daily?.length) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
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
        <h3 className="text-sm font-semibold text-gray-700">Website Analytics (Last 30 Days)</h3>
        {data.websiteUrl && (
          <a
            href={data.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-indigo-500 hover:underline"
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
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Daily trend chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-xs font-semibold text-gray-500 mb-4">Daily Traffic</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Sessions"  stroke="#6366f1" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Users"     stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Pageviews" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Traffic sources */}
      {sourceData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-500 mb-4">Traffic Sources</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sourceData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
              <Tooltip />
              <Bar dataKey="sessions" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
