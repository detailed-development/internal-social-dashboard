import { useMemo } from 'react'
import { useTheme } from '../../ThemeContext'

function formatCost(usd) {
  if (usd == null) return '—'
  return usd < 0.001 ? '<$0.001' : `$${usd.toFixed(4)}`
}

function fmtTokens(n) {
  if (n == null) return '—'
  return n >= 1000 ? `~${(n / 1000).toFixed(1)}k` : `~${n}`
}

function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleDateString() : ''
}

export default function ConfirmGenerateModal({ open, onConfirm, onCancel, checking, data, isRegenerate }) {
  const { theme } = useTheme()

  const entries = useMemo(() => Object.entries(data || {}), [data])
  const cacheableEntries = entries.filter(([, value]) => !value?.error)
  const allCached = cacheableEntries.length > 0 && cacheableEntries.every(([, value]) => value.cached)
  const uncached = cacheableEntries.filter(([, value]) => !value.cached)
  const totalUncachedCost = uncached.reduce((sum, [, value]) => sum + (value.estimatedCostUsd || 0), 0)
  const totalEstimatedRunCost = isRegenerate
    ? cacheableEntries.reduce((sum, [, value]) => sum + (value.estimatedCostUsd || 0), 0)
    : totalUncachedCost

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={onCancel}>
      <div
        className={`max-w-md w-full rounded-xl border p-5 shadow-xl ${theme.card}`}
        onClick={e => e.stopPropagation()}
      >
        <h3 className={`text-base font-semibold ${theme.heading}`}>Confirm AI Generation</h3>

        {isRegenerate && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Regenerate will bypass cache and request a fresh AI result.
          </div>
        )}

        {checking ? (
          <div className="py-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
            <p className={`mt-3 text-sm ${theme.muted}`}>Checking cache…</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="mt-4 space-y-3">
            <p className={`text-sm ${theme.body}`}>Could not check cache or cost estimate. You can still continue.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3 text-sm">
            <p className={theme.body}>Cached results are shared and reusable across users for the same inputs.</p>
            {allCached && !isRegenerate && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-800">
                A cached result is available. No new API call is needed.
              </div>
            )}
            <div className="space-y-2">
              {entries.map(([feature, value]) => (
                <div key={feature} className={`rounded-lg border p-3 ${theme.id === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-semibold uppercase tracking-wide ${theme.subtext}`}>{feature}</p>
                    {value?.error ? (
                      <span className="text-xs text-red-600">{value.error}</span>
                    ) : (
                      <span className={`text-xs font-medium ${value.cached ? 'text-green-600' : theme.muted}`}>
                        {value.cached ? 'Cached' : 'Not cached'}
                      </span>
                    )}
                  </div>
                  {!value?.error && (
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                      <span className={theme.muted}>Estimated tokens</span>
                      <span className={theme.body}>{fmtTokens(value.estimatedInputTokens)} in / {fmtTokens(value.estimatedOutputTokens)} out</span>
                      <span className={theme.muted}>Estimated cost</span>
                      <span className={theme.body}>{formatCost(value.estimatedCostUsd)}</span>
                      {value.cachedAt && (
                        <>
                          <span className={theme.muted}>Cached on</span>
                          <span className={theme.body}>{fmtDate(value.cachedAt)}</span>
                        </>
                      )}
                      {value.expiresAt && (
                        <>
                          <span className={theme.muted}>Cache expires</span>
                          <span className={theme.body}>{fmtDate(value.expiresAt)}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-3">
              <span className={theme.muted}>{isRegenerate ? 'Estimated cost (fresh run)' : 'Estimated cost (uncached work)'}</span>
              <span className={`font-semibold ${theme.heading}`}>{formatCost(totalEstimatedRunCost)}</span>
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className={`px-3 py-1.5 text-sm rounded-lg border ${theme.btnCancel}`}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={checking}
            className={`px-3 py-1.5 text-sm rounded-lg ${theme.btnPrimary}`}
          >
            {allCached && !isRegenerate ? 'Use cached result' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  )
}
