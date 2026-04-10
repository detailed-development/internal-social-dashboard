import { useState } from 'react'

function formatDate(d) {
  return new Date(d).toISOString().split('T')[0]
}

function fmtDisplayDate(dateStr) {
  if (!dateStr) return ''
  let d
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number)
    d = new Date(year, month - 1, day)
  } else {
    d = new Date(dateStr)
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CachedIntervalsPanel({ intervals, currentStart, currentEnd, onUse, onDelete, theme }) {
  const [confirmKey, setConfirmKey] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Determine which features appear across all intervals — only show badges for queried features
  const allFeatures = new Set(intervals.map(r => r.feature))

  // Group by (dateRangeStart, dateRangeEnd)
  const grouped = {}
  for (const row of intervals) {
    const start = row.dateRangeStart ? formatDate(row.dateRangeStart) : null
    const end   = row.dateRangeEnd   ? formatDate(row.dateRangeEnd)   : null
    if (!start || !end) continue
    const key = `${start}||${end}`
    if (!grouped[key]) grouped[key] = { start, end, features: {}, createdAt: row.createdAt, expiresAt: row.expiresAt }
    grouped[key].features[row.feature] = true
    if (row.createdAt > grouped[key].createdAt) grouped[key].createdAt = row.createdAt
    if (row.expiresAt && (!grouped[key].expiresAt || row.expiresAt > grouped[key].expiresAt)) {
      grouped[key].expiresAt = row.expiresAt
    }
  }

  const entries = Object.values(grouped).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  async function handleDelete(entry) {
    setDeleting(true)
    try {
      await onDelete(entry.start, entry.end)
    } finally {
      setDeleting(false)
      setConfirmKey(null)
    }
  }

  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${theme.muted}`}>Cached Intervals</p>
      {entries.length === 0 ? (
        <p className={`text-xs ${theme.muted}`}>No cached intervals yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const key = `${entry.start}||${entry.end}`
            const isActive = entry.start === currentStart && entry.end === currentEnd
            const isPendingDelete = confirmKey === key

            return (
              <div
                key={i}
                className={`rounded-lg border p-3 text-xs transition-colors ${
                  isPendingDelete
                    ? theme.id === 'dark'
                      ? 'border-red-700 bg-red-900/30'
                      : 'border-red-300 bg-red-50'
                    : isActive
                      ? theme.id === 'dark'
                        ? 'border-indigo-500 bg-indigo-900/40'
                        : 'border-indigo-400 bg-indigo-50'
                      : theme.id === 'dark'
                        ? 'border-gray-700 bg-gray-800/50'
                        : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <p className={`font-semibold ${theme.heading}`}>
                    {fmtDisplayDate(entry.start)} – {fmtDisplayDate(entry.end)}
                  </p>
                  {!isPendingDelete && (
                    <button
                      onClick={() => setConfirmKey(key)}
                      title="Remove from cache"
                      className={`flex-shrink-0 rounded p-0.5 transition-colors ${
                        theme.id === 'dark'
                          ? 'text-gray-500 hover:text-red-400 hover:bg-red-900/40'
                          : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                      }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/>
                      </svg>
                    </button>
                  )}
                </div>

                {isPendingDelete ? (
                  <div className="space-y-1.5">
                    <p className={`text-[10px] ${theme.id === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                      Remove this cached interval?
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleDelete(entry)}
                        disabled={deleting}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors disabled:opacity-50 ${
                          theme.id === 'dark'
                            ? 'bg-red-700 text-white hover:bg-red-600'
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                      >
                        {deleting ? 'Removing…' : 'Remove'}
                      </button>
                      <button
                        onClick={() => setConfirmKey(null)}
                        disabled={deleting}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors ${
                          theme.id === 'dark'
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        Keep
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {(allFeatures.has('weekly-insights') || allFeatures.has('report-draft')) && (
                      <div className="flex gap-1.5 flex-wrap mb-1.5">
                        {allFeatures.has('weekly-insights') && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                            entry.features['weekly-insights'] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {entry.features['weekly-insights'] ? '✓' : '✗'} Insights
                          </span>
                        )}
                        {allFeatures.has('report-draft') && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                            entry.features['report-draft'] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {entry.features['report-draft'] ? '✓' : '✗'} Report
                          </span>
                        )}
                      </div>
                    )}
                    <p className={`${theme.muted} mb-0.5`}>Generated {fmtDisplayDate(entry.createdAt)}</p>
                    {entry.expiresAt && (
                      <p className={theme.muted}>Expires {fmtDisplayDate(entry.expiresAt)}</p>
                    )}
                    {!isActive && (
                      <button
                        onClick={() => onUse(entry.start, entry.end)}
                        className={`mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors ${
                          theme.id === 'dark'
                            ? 'bg-indigo-700 text-white hover:bg-indigo-600'
                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                        }`}
                      >
                        Use these dates
                      </button>
                    )}
                    {isActive && (
                      <p className={`mt-1.5 text-[10px] font-semibold ${
                        theme.id === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                      }`}>
                        Currently selected
                      </p>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
