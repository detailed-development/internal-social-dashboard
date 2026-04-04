import { useEffect, useState } from 'react'
import { getOverview } from '../api'
import StatCard from '../components/StatCard'

export default function Overview() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    getOverview().then(setData).catch(() => setError(true))
  }, [])

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
        <p className="text-gray-500 text-sm mt-1">Last 30 days across all clients</p>
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
        <div className="mt-10 text-center text-gray-400 text-sm">
          Loading...
        </div>
      )}

      {data && data.activeClients === 0 && (
        <div className="mt-10 bg-indigo-50 border border-indigo-100 rounded-xl p-6 text-center">
          <p className="text-indigo-800 font-medium">No clients yet</p>
          <p className="text-indigo-500 text-sm mt-1">
            Add a client via the API and connect their social accounts to get started.
          </p>
        </div>
      )}
    </div>
  )
}
