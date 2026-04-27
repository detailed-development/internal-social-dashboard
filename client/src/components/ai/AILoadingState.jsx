import { useEffect, useState } from 'react'
import { useTheme } from '../../ThemeContext'

function SkeletonRows({ theme }) {
  return (
    <div className="space-y-3">
      <div className={`h-4 rounded w-3/4 animate-pulse ${theme.id === 'dark' ? 'bg-gray-600' : 'bg-gray-200'}`} />
      <div className={`h-4 rounded w-1/2 animate-pulse ${theme.id === 'dark' ? 'bg-gray-600' : 'bg-gray-200'}`} />
      <div className={`h-4 rounded w-5/6 animate-pulse ${theme.id === 'dark' ? 'bg-gray-600' : 'bg-gray-200'}`} />
    </div>
  )
}

export default function AILoadingState({ loading, error, onRetry, children }) {
  const { theme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const hasContent = Boolean(children)

  // Keep the initial Client Details layout stable by rendering this shell
  // collapsed. Once the user generates insights, expand automatically so the
  // loader/result/error is visible without requiring a second click.
  useEffect(() => {
    if (loading || error || hasContent) {
      setIsOpen(true)
    }
  }, [loading, error, hasContent])

  return (
    <div className={`rounded-xl border overflow-hidden min-h-[76px] ${theme.card}`}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="w-full min-h-[76px] flex items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:opacity-80"
        aria-expanded={isOpen}
      >
        <div>
          <p className={`text-sm font-semibold ${theme.heading}`}>Insights</p>
          <p className={`text-xs ${theme.muted}`}>
            {loading
              ? 'Generating analytics narrative...'
              : error
                ? 'There was a problem generating insights.'
                : hasContent
                  ? 'Generated analysis, charts, and report output.'
                  : 'Choose a date range and generate insights.'}
          </p>
        </div>
        <svg
          className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? '' : '-rotate-90'} ${theme.muted}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className={`border-t p-5 ${theme.cardDivider}`}>
          {loading && (
            <div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span className={`text-sm ${theme.muted}`}>Generating with AI...</span>
              </div>
              <div className="mt-4">
                <SkeletonRows theme={theme} />
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700 mb-2">{error}</p>
              {onRetry && (
                <button onClick={onRetry} className="text-sm text-red-600 font-medium hover:text-red-800">
                  Try Again
                </button>
              )}
            </div>
          )}

          {!loading && !error && hasContent && children}

          {!loading && !error && !hasContent && (
            <div>
              <p className={`text-sm ${theme.muted}`}>Insights will appear here after generation.</p>
              <div className="mt-4">
                <SkeletonRows theme={theme} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
