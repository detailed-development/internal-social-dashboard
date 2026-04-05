import { useState, useEffect } from 'react'
import { generateReportDraft, getClients } from '../../api'
import { useTheme } from '../../ThemeContext'
import AILoadingState from './AILoadingState'

function formatDate(d) {
  return new Date(d).toISOString().split('T')[0]
}

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
    .replace(/^\d+\. (.+)/gm, '<li class="ml-4">$1</li>')
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

export default function ReportDraftGenerator() {
  const { theme } = useTheme()
  const now = new Date()
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)

  const [clients, setClients] = useState([])
  const [clientSlug, setClientSlug] = useState('')
  const [dateStart, setDateStart] = useState(formatDate(monthAgo))
  const [dateEnd, setDateEnd] = useState(formatDate(now))
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getClients().then(data => {
      setClients(data)
      if (data.length > 0 && !clientSlug) setClientSlug(data[0].slug)
    }).catch(() => {})
  }, [])

  async function handleGenerate(forceRefresh = false) {
    if (!clientSlug) return
    setLoading(true)
    setError(null)
    try {
      const data = await generateReportDraft({
        clientSlug,
        dateRangeStart: dateStart,
        dateRangeEnd: dateEnd,
        forceRefresh,
      })
      setResult(data)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to generate report.')
    } finally {
      setLoading(false)
    }
  }

  function copyReport() {
    if (!result?.report) return
    navigator.clipboard.writeText(result.report)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-xl p-5 ${theme.card}`}>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Client</label>
            <select value={clientSlug} onChange={e => setClientSlug(e.target.value)} className={`text-sm rounded-lg px-3 py-1.5 ${theme.input}`}>
              {clients.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>From</label>
            <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className={`text-sm rounded-lg px-3 py-1.5 ${theme.input}`} />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>To</label>
            <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className={`text-sm rounded-lg px-3 py-1.5 ${theme.input}`} />
          </div>
        </div>
        <button onClick={() => handleGenerate(false)} disabled={loading || !clientSlug} className={`px-5 py-2 text-sm font-medium rounded-lg ${theme.btnPrimary}`}>
          {loading ? 'Generating Report...' : 'Generate Report Draft'}
        </button>
      </div>

      <AILoadingState loading={loading} error={error} onRetry={() => handleGenerate(false)}>
        {result && (
          <div className={`rounded-xl p-6 ${theme.card}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${theme.heading}`}>Report Draft</h3>
              <div className="flex items-center gap-3 text-xs">
                <span className={`px-2 py-0.5 rounded-full ${result.cached ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {result.cached ? 'Cached' : 'Fresh'}
                </span>
                {result.usage && (
                  <span className={theme.muted}>{result.usage.totalTokens} tokens</span>
                )}
                <button onClick={copyReport} className="text-indigo-600 hover:text-indigo-800 font-medium">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={() => handleGenerate(true)} className="text-indigo-600 hover:text-indigo-800 font-medium">
                  Regenerate
                </button>
              </div>
            </div>
            <div className={`prose prose-sm max-w-none ${theme.id === 'dark' ? 'prose-invert' : ''}`}>
              <div dangerouslySetInnerHTML={{ __html: markdownToHtml(result.report) }} />
            </div>
          </div>
        )}
      </AILoadingState>
    </div>
  )
}
