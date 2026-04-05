import { useEffect, useState } from 'react'
import { getOverview } from '../api'
import StatCard from '../components/StatCard'
import { useTheme } from '../ThemeContext'

export default function Overview() {
  const { theme } = useTheme()
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    getOverview().then(setData).catch(() => setError(true))
  }, [])

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className={`text-2xl font-bold ${theme.heading}`}>Overview</h2>
        <p className={`text-sm mt-1 ${theme.subtext}`}>Last 30 days across all clients</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Active Clients"    value={data?.activeClients} />
        <StatCard label="Posts Published"   value={data?.totalPosts}    sub="last 30 days" />
        <StatCard
          label="Total Engagement"
          value={data?.totalEngagement != null ? data.totalEngagement.toLocaleString() : undefined}
          sub="likes + comments + shares + saves"
        />
      </div>

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
