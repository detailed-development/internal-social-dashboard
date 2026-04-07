import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTheme } from '../ThemeContext'
import { triggerAutoRefresh } from '../api'

export default function AdminBar() {
  const { theme } = useTheme()
  const [refreshing, setRefreshing] = useState(false)
  const [status, setStatus] = useState(null) // 'ok' | 'error'

  async function handleRefresh() {
    setRefreshing(true)
    setStatus(null)
    try {
      await triggerAutoRefresh()
      setStatus('ok')
    } catch {
      setStatus('error')
    } finally {
      setRefreshing(false)
      setTimeout(() => setStatus(null), 4000)
    }
  }

  return (
    <div className="flex-shrink-0 flex items-center justify-between px-4 h-10 bg-gray-950 border-b border-gray-800 z-50">
      {/* Left: identity */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold tracking-widest uppercase text-gray-500 select-none">
          NCM Internal
        </span>
        <span className="w-px h-3 bg-gray-700" />
        <span className="text-xs text-gray-600 select-none">Admin Bar</span>
      </div>

      {/* Right: quick actions */}
      <div className="flex items-center gap-2">
        {status === 'ok' && (
          <span className="text-xs text-green-400">Tokens refreshed</span>
        )}
        {status === 'error' && (
          <span className="text-xs text-red-400">Refresh failed</span>
        )}

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {refreshing ? 'Refreshing…' : 'Refresh Tokens'}
        </button>

        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              isActive
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
            }`
          }
        >
          <svg
            className="w-3 h-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Admin
        </NavLink>
      </div>
    </div>
  )
}
