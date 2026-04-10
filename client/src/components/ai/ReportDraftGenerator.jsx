import { useState, useEffect } from 'react'
import { generateReportDraft, getClients, checkAiGeneration, getCachedIntervals, deleteCachedInterval } from '../../api'
import { useTheme } from '../../ThemeContext'
import AILoadingState from './AILoadingState'
import ConfirmGenerateModal from './ConfirmGenerateModal'
import CachedIntervalsPanel from './CachedIntervalsPanel'

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

function initMonthDates() {
  const n = new Date()
  return {
    start: formatDate(new Date(n.getFullYear(), n.getMonth(), 1)),
    end:   formatDate(new Date(n.getFullYear(), n.getMonth() + 1, 0)),
  }
}

export default function ReportDraftGenerator() {
  const { theme } = useTheme()

  const initial = initMonthDates()
  const [intervalMode, setIntervalMode] = useState('monthly') // 'weekly' | 'monthly' | 'custom'
  const [clients, setClients] = useState([])
  const [clientSlug, setClientSlug] = useState('')
  const [dateStart, setDateStart] = useState(initial.start)
  const [dateEnd, setDateEnd] = useState(initial.end)
  const [cachedIntervals, setCachedIntervals] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmData, setConfirmData] = useState(null)
  const [confirmChecking, setConfirmChecking] = useState(false)
  const [pendingForceRefresh, setPendingForceRefresh] = useState(false)

  useEffect(() => {
    getClients().then(data => {
      setClients(data)
      if (data.length > 0 && !clientSlug) setClientSlug(data[0].slug)
    }).catch(() => {})
  }, [])

  useEffect(() => { fetchCachedIntervals() }, [clientSlug])

  function applyPreset(mode) {
    const n = new Date()
    if (mode === 'weekly') {
      const sunday = new Date(n)
      sunday.setDate(n.getDate() - n.getDay())
      const saturday = new Date(sunday)
      saturday.setDate(sunday.getDate() + 6)
      setDateStart(formatDate(sunday))
      setDateEnd(formatDate(saturday))
    } else if (mode === 'monthly') {
      setDateStart(formatDate(new Date(n.getFullYear(), n.getMonth(), 1)))
      setDateEnd(formatDate(new Date(n.getFullYear(), n.getMonth() + 1, 0)))
    }
    setIntervalMode(mode)
  }

  async function fetchCachedIntervals() {
    if (!clientSlug) return
    try {
      const rows = await getCachedIntervals({ clientSlug, features: 'report-draft' })
      setCachedIntervals(rows)
    } catch { /* non-critical */ }
  }

  async function handleDeleteInterval(start, end) {
    await deleteCachedInterval({
      clientSlug,
      dateRangeStart: start,
      dateRangeEnd: end,
      features: ['report-draft'],
    })
    await fetchCachedIntervals()
  }

  async function openConfirm(forceRefresh = false) {
    if (!clientSlug) return
    setPendingForceRefresh(forceRefresh)
    setShowConfirm(true)
    setConfirmData(null)
    setConfirmChecking(true)
    try {
      const data = await checkAiGeneration({
        features: ['report-draft'],
        clientSlug,
        dateRangeStart: dateStart,
        dateRangeEnd: dateEnd,
      })
      setConfirmData(data)
    } catch {
      setConfirmData(null)
    } finally {
      setConfirmChecking(false)
    }
  }

  function handleConfirm() {
    setShowConfirm(false)
    handleGenerate(pendingForceRefresh)
  }

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
      await fetchCachedIntervals()
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
        <div className="flex flex-col md:flex-row gap-4">

          {/* Left: client selector + interval presets + date pickers + button */}
          <div className="flex-1 space-y-3">
            {/* Client */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Client</label>
              <select
                value={clientSlug}
                onChange={e => setClientSlug(e.target.value)}
                className={`text-sm rounded-lg px-3 py-1.5 ${theme.input}`}
              >
                {clients.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>

            {/* Interval presets */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${theme.muted}`}>Date Range</label>
              <div className="flex gap-1">
                {[['weekly', 'Weekly'], ['monthly', 'Monthly'], ['custom', 'Custom']].map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => applyPreset(mode)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      intervalMode === mode
                        ? 'bg-indigo-600 text-white'
                        : theme.id === 'dark'
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom date pickers */}
            {intervalMode === 'custom' ? (
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>From</label>
                  <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className={`text-sm rounded-lg px-3 py-1.5 ${theme.input}`} />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>To</label>
                  <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className={`text-sm rounded-lg px-3 py-1.5 ${theme.input}`} />
                </div>
              </div>
            ) : (
              <p className={`text-xs ${theme.muted}`}>
                {fmtDisplayDate(dateStart)} – {fmtDisplayDate(dateEnd)}
              </p>
            )}

            {/* Generate button */}
            <button
              onClick={() => openConfirm(false)}
              disabled={loading || !clientSlug}
              className={`px-5 py-2 text-sm font-medium rounded-lg ${theme.btnPrimary}`}
            >
              {loading ? 'Generating Report...' : 'Generate Report Draft'}
            </button>
          </div>

          {/* Right: cached intervals */}
          <div className={`md:w-60 shrink-0 ${theme.id === 'dark' ? 'border-gray-700' : 'border-gray-200'} md:border-l md:pl-4`}>
            <CachedIntervalsPanel
              intervals={cachedIntervals}
              currentStart={dateStart}
              currentEnd={dateEnd}
              onUse={(start, end) => {
                setIntervalMode('custom')
                setDateStart(start)
                setDateEnd(end)
              }}
              onDelete={handleDeleteInterval}
              theme={theme}
            />
          </div>
        </div>
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
                <button onClick={() => openConfirm(true)} className="text-indigo-600 hover:text-indigo-800 font-medium">
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
      <ConfirmGenerateModal
        open={showConfirm}
        checking={confirmChecking}
        data={confirmData}
        isRegenerate={pendingForceRefresh}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  )
}
