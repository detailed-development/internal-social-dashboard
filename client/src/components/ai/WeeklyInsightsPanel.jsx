import { useState } from 'react'
import { generateWeeklyInsights } from '../../api'
import { useTheme } from '../../ThemeContext'
import AILoadingState from './AILoadingState'

function formatDate(d) {
  return new Date(d).toISOString().split('T')[0]
}

export default function WeeklyInsightsPanel({ clientSlug }) {
  const { theme } = useTheme()
  const now = new Date()
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

  const [dateStart, setDateStart] = useState(formatDate(weekAgo))
  const [dateEnd, setDateEnd] = useState(formatDate(now))
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleGenerate(forceRefresh = false) {
    setLoading(true)
    setError(null)
    try {
      const data = await generateWeeklyInsights({
        clientSlug,
        dateRangeStart: dateStart,
        dateRangeEnd: dateEnd,
        forceRefresh,
      })
      setResult(data)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to generate insights. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className={`rounded-xl p-4 ${theme.card}`}>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>From</label>
            <input
              type="date"
              value={dateStart}
              onChange={e => setDateStart(e.target.value)}
              className={`text-sm rounded-lg px-3 py-1.5 ${theme.input}`}
            />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>To</label>
            <input
              type="date"
              value={dateEnd}
              onChange={e => setDateEnd(e.target.value)}
              className={`text-sm rounded-lg px-3 py-1.5 ${theme.input}`}
            />
          </div>
          <button onClick={() => handleGenerate(false)} disabled={loading} className={`px-4 py-1.5 text-sm font-medium rounded-lg ${theme.btnPrimary}`}>
            {loading ? 'Generating...' : 'Generate Insights'}
          </button>
          {result && (
            <button onClick={() => handleGenerate(true)} disabled={loading} className={`px-3 py-1.5 text-sm rounded-lg ${theme.btnOutline || 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              Regenerate
            </button>
          )}
        </div>
      </div>

      {/* Result */}
      <AILoadingState loading={loading} error={error} onRetry={() => handleGenerate(false)}>
        {result && (
          <div className={`rounded-xl p-6 ${theme.card}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${theme.heading}`}>Weekly Insights</h3>
              <div className="flex items-center gap-3 text-xs">
                <span className={`px-2 py-0.5 rounded-full ${result.cached ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {result.cached ? 'Cached' : 'Fresh'}
                </span>
                {result.usage && (
                  <span className={theme.muted}>{result.usage.totalTokens} tokens</span>
                )}
              </div>
            </div>
            <div className={`prose prose-sm max-w-none ${theme.id === 'dark' ? 'prose-invert' : ''}`}>
              <div dangerouslySetInnerHTML={{ __html: markdownToHtml(result.insights) }} />
            </div>
          </div>
        )}
      </AILoadingState>
    </div>
  )
}

// Minimal markdown → HTML (headers, bold, italic, lists, line breaks)
function markdownToHtml(md) {
  if (!md) return ''
  return md
    .replace(/### (.+)/g, '<h4 class="font-semibold mt-4 mb-1">$1</h4>')
    .replace(/## (.+)/g, '<h3 class="font-bold mt-5 mb-2 text-base">$1</h3>')
    .replace(/# (.+)/g, '<h2 class="font-bold mt-6 mb-2 text-lg">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)/gm, '<li class="ml-4">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc mb-2">$&</ul>')
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}
