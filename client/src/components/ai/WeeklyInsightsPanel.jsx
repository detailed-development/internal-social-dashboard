import { useState, useEffect } from 'react'
import { generateWeeklyInsights, generateReportDraft, checkAiGeneration, getCachedIntervals, deleteCachedInterval, getReportStyles, createReportStyle, deleteReportStyle } from '../../api'
import { useTheme } from '../../ThemeContext'
import AILoadingState from './AILoadingState'
import ConfirmGenerateModal from './ConfirmGenerateModal'
import CachedIntervalsPanel from './CachedIntervalsPanel'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

function formatDate(d) {
  return new Date(d).toISOString().split('T')[0]
}

function fmt(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function fmtDate(dateStr) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function fmtDisplayDate(dateStr) {
  if (!dateStr) return ''
  let d
  // YYYY-MM-DD strings are parsed as UTC midnight by the Date constructor,
  // which shifts the displayed day back by one in negative-offset timezones.
  // Parse them as local dates instead; full ISO datetime strings are fine as-is.
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number)
    d = new Date(year, month - 1, day)
  } else {
    d = new Date(dateStr)
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const PIE_COLORS = ['#6366f1', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#a78bfa']

const ALL_MODULES = [
  { key: 'executive_summary', label: 'Executive Summary' },
  { key: 'social_overview', label: 'Social Performance' },
  { key: 'platform_comparison', label: 'Platform Comparison' },
  { key: 'website_ga4', label: 'Website / GA4' },
  { key: 'top_content', label: 'Top Content' },
  { key: 'cross_channel', label: 'Cross-Channel Matrix' },
  { key: 'key_learnings', label: 'Key Learnings' },
  { key: 'recommendations', label: 'Recommendations' },
  { key: 'next_period', label: 'Next-Period Focus' },
]

/* ── Main Component ──────────────────────────────────────────────────────────── */
export default function WeeklyInsightsPanel({ clientSlug, clientId }) {
  const { theme } = useTheme()
  const c = theme.chart
  const now = new Date()

  const [intervalMode, setIntervalMode] = useState('weekly') // 'weekly' | 'monthly' | 'custom'

  // Initialise to current Sunday–Saturday week
  const initSunday = new Date(now)
  initSunday.setDate(now.getDate() - now.getDay())
  const initSaturday = new Date(initSunday)
  initSaturday.setDate(initSunday.getDate() + 6)

  const [dateStart, setDateStart] = useState(formatDate(initSunday))
  const [dateEnd, setDateEnd] = useState(formatDate(initSaturday))
  const [cachedIntervals, setCachedIntervals] = useState([])
  const [insights, setInsights] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeView, setActiveView] = useState('insights') // 'insights' | 'report'
  const [expandedSections, setExpandedSections] = useState({})
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmData, setConfirmData] = useState(null)
  const [confirmChecking, setConfirmChecking] = useState(false)
  const [pendingForceRefresh, setPendingForceRefresh] = useState(false)

  // Module selector + saved styles
  const [selectedModules, setSelectedModules] = useState(ALL_MODULES.map(m => m.key))
  const [showModules, setShowModules] = useState(false)
  const [reportStyles, setReportStyles] = useState([])
  const [saveStyleName, setSaveStyleName] = useState('')
  const [savingStyle, setSavingStyle] = useState(false)

  function applyPreset(mode) {
    const n = new Date()
    if (mode === 'weekly') {
      // Sunday–Saturday of the current calendar week
      const sunday = new Date(n)
      sunday.setDate(n.getDate() - n.getDay())
      const saturday = new Date(sunday)
      saturday.setDate(sunday.getDate() + 6)
      setDateStart(formatDate(sunday))
      setDateEnd(formatDate(saturday))
    } else if (mode === 'monthly') {
      // 1st through last day of the current calendar month
      const firstDay = new Date(n.getFullYear(), n.getMonth(), 1)
      const lastDay  = new Date(n.getFullYear(), n.getMonth() + 1, 0)
      setDateStart(formatDate(firstDay))
      setDateEnd(formatDate(lastDay))
    }
    // 'custom': leave dates as-is
    setIntervalMode(mode)
  }

  async function fetchCachedIntervals() {
    if (!clientSlug) return
    try {
      const rows = await getCachedIntervals({ clientSlug, features: 'weekly-insights,report-draft' })
      setCachedIntervals(rows)
    } catch { /* non-critical */ }
  }

  async function handleDeleteInterval(start, end) {
    await deleteCachedInterval({
      clientSlug,
      dateRangeStart: start,
      dateRangeEnd: end,
      features: ['weekly-insights', 'report-draft'],
    })
    await fetchCachedIntervals()
  }

  useEffect(() => { fetchCachedIntervals() }, [clientSlug])

  useEffect(() => {
    if (!clientId) return
    getReportStyles(clientId).then(setReportStyles).catch(() => {})
  }, [clientId])

  async function handleSaveStyle(e) {
    e.preventDefault()
    if (!saveStyleName.trim() || !clientId) return
    setSavingStyle(true)
    try {
      const style = await createReportStyle({ clientId, name: saveStyleName.trim(), selectedModules })
      setReportStyles(prev => [...prev, style])
      setSaveStyleName('')
    } catch {}
    setSavingStyle(false)
  }

  async function handleDeleteStyle(id) {
    try {
      await deleteReportStyle(id)
      setReportStyles(prev => prev.filter(s => s.id !== id))
    } catch {}
  }

  function handleLoadStyle(style) {
    setSelectedModules(style.selectedModules)
  }

  async function openConfirm(forceRefresh = false) {
    if (!clientSlug) return

    setPendingForceRefresh(forceRefresh)
    setShowConfirm(true)
    setConfirmData(null)
    setConfirmChecking(true)

    try {
      const data = await checkAiGeneration({
        features: ['weekly-insights', 'report-draft'],
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
    setLoading(true)
    setError(null)
    try {
      const [insightsData, reportData] = await Promise.all([
        generateWeeklyInsights({ clientSlug, dateRangeStart: dateStart, dateRangeEnd: dateEnd, forceRefresh }),
        generateReportDraft({
          clientSlug,
          dateRangeStart: dateStart,
          dateRangeEnd: dateEnd,
          forceRefresh,
          selectedModules: selectedModules.length < ALL_MODULES.length ? selectedModules : null,
        }),
      ])
      setInsights(insightsData)
      setReport(reportData)
      await fetchCachedIntervals()
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to generate insights.')
    } finally {
      setLoading(false)
    }
  }

  function toggleSection(key) {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function copyReport() {
    if (!report?.report) return
    navigator.clipboard.writeText(report.report)
  }

  const cd = report?.chartData || {}

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className={`rounded-xl p-4 ${theme.card}`}>
        <div className="flex flex-col md:flex-row gap-4">

          {/* Left: interval presets + date pickers + generate button */}
          <div className="flex-1 space-y-3">
            {/* Preset buttons */}
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
                        ? theme.id === 'dark'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-600 text-white'
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

            {/* Custom date pickers — only shown in custom mode */}
            {intervalMode === 'custom' && (
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
            )}

            {/* Date display for presets */}
            {intervalMode !== 'custom' && (
              <p className={`text-xs ${theme.muted}`}>
                {fmtDisplayDate(dateStart)} – {fmtDisplayDate(dateEnd)}
              </p>
            )}

            {/* Module selector */}
            <div>
              <button
                type="button"
                onClick={() => setShowModules(v => !v)}
                className={`text-xs flex items-center gap-1 ${theme.muted} hover:opacity-80`}
              >
                <span>Report Modules</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${theme.code}`}>
                  {selectedModules.length}/{ALL_MODULES.length}
                </span>
                <span>{showModules ? '▲' : '▼'}</span>
              </button>

              {showModules && (
                <div className={`mt-2 p-3 rounded-xl border space-y-3 ${theme.card}`}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {ALL_MODULES.map(m => (
                      <label key={m.key} className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedModules.includes(m.key)}
                          onChange={() => setSelectedModules(prev =>
                            prev.includes(m.key) ? prev.filter(k => k !== m.key) : [...prev, m.key]
                          )}
                          className="rounded"
                        />
                        <span className={`text-xs ${theme.body}`}>{m.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Saved styles */}
                  <div className={`border-t pt-2 ${theme.cardDivider}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1.5 ${theme.subtext}`}>Saved Styles</p>
                    {reportStyles.length === 0 && (
                      <p className={`text-xs ${theme.muted}`}>No saved styles yet.</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {reportStyles.map(s => (
                        <div key={s.id} className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleLoadStyle(s)}
                            className={`text-xs px-2 py-0.5 rounded-full border ${theme.code} ${theme.body}`}
                          >
                            {s.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStyle(s.id)}
                            className="text-[10px] text-red-400 hover:text-red-600"
                          >✕</button>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleSaveStyle} className="flex items-center gap-1.5">
                      <input
                        value={saveStyleName}
                        onChange={e => setSaveStyleName(e.target.value)}
                        placeholder="Style name…"
                        className={`text-xs rounded-lg border px-2 py-1 focus:outline-none flex-1 ${theme.input}`}
                      />
                      <button
                        type="submit"
                        disabled={savingStyle || !saveStyleName.trim()}
                        className={`text-xs px-2.5 py-1 rounded-lg ${theme.btnPrimary}`}
                      >
                        {savingStyle ? '…' : 'Save'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => openConfirm(false)} disabled={loading} className={`px-4 py-1.5 text-sm font-medium rounded-lg ${theme.btnPrimary}`}>
                {loading ? 'Generating...' : 'Generate Insights'}
              </button>
              {report && (
                <button onClick={() => openConfirm(true)} disabled={loading} className={`px-3 py-1.5 text-sm rounded-lg ${theme.btnOutline || 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                  Regenerate
                </button>
              )}
            </div>
          </div>

          {/* Right: Cached Intervals panel */}
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
        {report && (
          <div className="space-y-4">
            {/* View toggle + meta */}
            <div className={`rounded-xl p-4 ${theme.card}`}>
              <div className="flex items-center justify-between">
                <div className="flex gap-1 p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                  {[
                    { key: 'insights', label: 'Quick Insights' },
                    { key: 'report', label: 'Full Report' },
                  ].map(v => (
                    <button
                      key={v.key}
                      onClick={() => setActiveView(v.key)}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                        activeView === v.key
                          ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400'
                          : `${theme.muted} hover:text-gray-700 dark:hover:text-gray-300`
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={`px-2 py-0.5 rounded-full ${report.cached ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {report.cached ? 'Cached' : 'Fresh'}
                  </span>
                  <span className={theme.muted}>
                    {(insights?.usage?.totalTokens || 0) + (report?.usage?.totalTokens || 0)} tokens
                  </span>
                  {activeView === 'report' && (
                    <button onClick={copyReport} className="text-indigo-600 hover:text-indigo-800 font-medium">
                      Copy
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Platform Overview Stat Cards ─────────────────────── */}
            {cd.platformTotals?.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {cd.platformTotals.map(p => (
                  <div key={p.platform + p.handle} className={`rounded-xl border p-4 ${theme.card}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                        p.platform === 'INSTAGRAM' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {p.platform === 'INSTAGRAM' ? 'IG' : 'FB'}
                      </span>
                      <span className={`text-xs truncate ${theme.muted}`}>@{p.handle}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div>
                        <p className={`text-[10px] uppercase tracking-wide ${theme.muted}`}>Posts</p>
                        <p className={`text-lg font-bold ${theme.heading}`}>{p.posts}</p>
                      </div>
                      <div>
                        <p className={`text-[10px] uppercase tracking-wide ${theme.muted}`}>Reach</p>
                        <p className={`text-lg font-bold ${theme.heading}`}>{fmt(p.reach)}</p>
                      </div>
                      <div>
                        <p className={`text-[10px] uppercase tracking-wide ${theme.muted}`}>Likes</p>
                        <p className={`text-lg font-bold ${theme.heading}`}>{fmt(p.likes)}</p>
                      </div>
                      <div>
                        <p className={`text-[10px] uppercase tracking-wide ${theme.muted}`}>Comments</p>
                        <p className={`text-lg font-bold ${theme.heading}`}>{fmt(p.comments)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Daily Engagement Chart ───────────────────────────── */}
            {cd.dailyEngagement?.length > 0 && (
              <div className={`rounded-xl border p-5 ${theme.card}`}>
                <p className={`text-xs font-semibold mb-4 ${theme.subtext}`}>Daily Social Engagement</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={cd.dailyEngagement.map(d => ({ ...d, date: fmtDate(d.date) }))} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: c.tickFill }} />
                    <YAxis tick={{ fontSize: 11, fill: c.tickFill }} />
                    <Tooltip contentStyle={{ backgroundColor: c.tooltipBg, borderColor: c.grid }} />
                    <Legend />
                    {cd.dailyEngagement.some(d => d.instagram_likes != null) && (
                      <Bar dataKey="instagram_likes" name="IG Likes" fill="#f472b6" radius={[4, 4, 0, 0]} />
                    )}
                    {cd.dailyEngagement.some(d => d.instagram_comments != null) && (
                      <Bar dataKey="instagram_comments" name="IG Comments" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    )}
                    {cd.dailyEngagement.some(d => d.facebook_likes != null) && (
                      <Bar dataKey="facebook_likes" name="FB Likes" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                    )}
                    {cd.dailyEngagement.some(d => d.facebook_comments != null) && (
                      <Bar dataKey="facebook_comments" name="FB Comments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Post Type + Traffic Sources side-by-side ─────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Post type pie */}
              {cd.postTypeBreakdown?.length > 0 && (
                <div className={`rounded-xl border p-5 ${theme.card}`}>
                  <p className={`text-xs font-semibold mb-4 ${theme.subtext}`}>Content Types</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={cd.postTypeBreakdown.map(t => ({ name: t.type, value: t.count }))}
                        cx="50%" cy="50%" outerRadius={70} innerRadius={35}
                        dataKey="value" label={({ name, value }) => `${name} (${value})`}
                        labelLine={false}
                      >
                        {cd.postTypeBreakdown.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Traffic sources */}
              {cd.trafficSources?.length > 0 && (
                <div className={`rounded-xl border p-5 ${theme.card}`}>
                  <p className={`text-xs font-semibold mb-4 ${theme.subtext}`}>Top Traffic Sources</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={cd.trafficSources.map(s => ({ name: `${s.source}/${s.medium}`, sessions: s.sessions }))} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: c.tickFill }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: c.tickFill }} width={120} />
                      <Tooltip contentStyle={{ backgroundColor: c.tooltipBg, borderColor: c.grid }} />
                      <Bar dataKey="sessions" fill={c.sources || '#6366f1'} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* ── GA4 Daily Traffic Chart ──────────────────────────── */}
            {cd.dailyTraffic?.length > 0 && (
              <div className={`rounded-xl border p-5 ${theme.card}`}>
                <p className={`text-xs font-semibold mb-4 ${theme.subtext}`}>Website Traffic</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={cd.dailyTraffic.map(d => ({ ...d, date: fmtDate(d.date) }))} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: c.tickFill }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: c.tickFill }} />
                    <Tooltip contentStyle={{ backgroundColor: c.tooltipBg, borderColor: c.grid }} />
                    <Legend />
                    <Line type="monotone" dataKey="sessions" name="Sessions" stroke={c.line1} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="users" name="Users" stroke={c.line2} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="pageviews" name="Pageviews" stroke={c.line3} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Top Posts ────────────────────────────────────────── */}
            {cd.topPosts?.length > 0 && (
              <div className={`rounded-xl border p-5 ${theme.card}`}>
                <p className={`text-xs font-semibold mb-3 ${theme.subtext}`}>Top Performing Posts</p>
                <div className="space-y-2">
                  {cd.topPosts.slice(0, 5).map((post, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${theme.id === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <span className={`text-lg font-bold w-6 text-center ${theme.muted}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${theme.body}`}>
                          {post.caption || '(no caption)'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            post.platform === 'INSTAGRAM' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                          }`}>{post.platform === 'INSTAGRAM' ? 'IG' : 'FB'}</span>
                          <span className={`text-[10px] ${theme.muted}`}>{post.mediaType}</span>
                          <span className={`text-[10px] ${theme.muted}`}>{post.publishedAt}</span>
                        </div>
                      </div>
                      <div className="flex gap-3 text-center">
                        {[
                          { label: 'Likes', val: post.likes },
                          { label: 'Comments', val: post.comments },
                          { label: 'Reach', val: post.reach },
                        ].map(m => (
                          <div key={m.label}>
                            <p className={`text-xs font-bold ${theme.heading}`}>{fmt(m.val)}</p>
                            <p className={`text-[9px] ${theme.muted}`}>{m.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── AI Narrative (collapsible sections) ─────────────── */}
            <div className={`rounded-xl border p-6 ${theme.card}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-base font-semibold ${theme.heading}`}>
                  {activeView === 'insights' ? 'AI Quick Insights' : 'Full Report'}
                </h3>
              </div>
              <div className={`prose prose-sm max-w-none ${theme.id === 'dark' ? 'prose-invert' : ''}`}>
                {activeView === 'insights' && insights?.insights ? (
                  <NarrativeSections
                    markdown={insights.insights}
                    expanded={expandedSections}
                    onToggle={toggleSection}
                    theme={theme}
                  />
                ) : report?.report ? (
                  <NarrativeSections
                    markdown={report.report}
                    expanded={expandedSections}
                    onToggle={toggleSection}
                    theme={theme}
                  />
                ) : null}
              </div>
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

/* ── Collapsible markdown sections ──────────────────────────────────── */
function NarrativeSections({ markdown, expanded, onToggle, theme }) {
  if (!markdown) return null

  // Split on ### headers into collapsible sections
  const sections = []
  const lines = markdown.split('\n')
  let current = null

  for (const line of lines) {
    const h3Match = line.match(/^###\s+(.+)/)
    const h2Match = line.match(/^##\s+(.+)/)
    const h1Match = line.match(/^#\s+(.+)/)

    if (h3Match || h2Match || h1Match) {
      if (current) sections.push(current)
      const title = (h3Match || h2Match || h1Match)[1]
      current = { title, body: '', level: h3Match ? 3 : h2Match ? 2 : 1 }
    } else if (current) {
      current.body += line + '\n'
    } else {
      // Content before first header — show as intro
      if (!sections.length && line.trim()) {
        sections.push({ title: null, body: (sections[0]?.body || '') + line + '\n', level: 0 })
      }
    }
  }
  if (current) sections.push(current)

  return (
    <div className="space-y-2">
      {sections.map((sec, i) => {
        if (!sec.title) {
          return <div key={i} dangerouslySetInnerHTML={{ __html: inlineMarkdown(sec.body) }} />
        }

        const key = sec.title
        const isOpen = expanded[key] !== false // default open
        const emoji = getSectionEmoji(sec.title)

        return (
          <div key={i} className={`rounded-lg overflow-hidden ${theme.id === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
            <button
              onClick={() => onToggle(key)}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-left hover:opacity-80 transition-opacity`}
            >
              <span className="text-base">{emoji}</span>
              <span className={`flex-1 text-sm font-semibold ${theme.heading}`}>{sec.title}</span>
              <span className={`text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                <ChevronDown />
              </span>
            </button>
            {isOpen && (
              <div className="px-4 pb-3 text-sm" dangerouslySetInnerHTML={{ __html: inlineMarkdown(sec.body) }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.47 5.47a.75.75 0 011.06 0L8 7.94l2.47-2.47a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 010-1.06z" />
    </svg>
  )
}

function getSectionEmoji(title) {
  const t = title.toLowerCase()
  if (t.includes('executive') || t.includes('summary')) return '\u{1F4CB}'
  if (t.includes('win') || t.includes('top')) return '\u{1F3C6}'
  if (t.includes('drop') || t.includes('risk')) return '\u{26A0}\u{FE0F}'
  if (t.includes('social') || t.includes('engagement')) return '\u{1F4F1}'
  if (t.includes('web') || t.includes('traffic') || t.includes('ga4')) return '\u{1F310}'
  if (t.includes('platform') || t.includes('comparison')) return '\u{2696}\u{FE0F}'
  if (t.includes('cross') || t.includes('channel') || t.includes('matrix')) return '\u{1F517}'
  if (t.includes('learn') || t.includes('insight')) return '\u{1F4A1}'
  if (t.includes('recommend') || t.includes('action')) return '\u{1F680}'
  if (t.includes('theme') || t.includes('buzz') || t.includes('emerging')) return '\u{1F50D}'
  if (t.includes('pattern') || t.includes('audience')) return '\u{1F465}'
  if (t.includes('next') || t.includes('focus') || t.includes('priority')) return '\u{1F3AF}'
  if (t.includes('content') || t.includes('format')) return '\u{1F3A8}'
  return '\u{1F4CC}'
}

function inlineMarkdown(md) {
  if (!md) return ''
  return md
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)/gm, '<li class="ml-4 mb-0.5">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc mb-2 space-y-0.5">$&</ul>')
    .replace(/^\d+\.\s+(.+)/gm, '<li class="ml-4 mb-0.5">$1</li>')
    .replace(/\n{2,}/g, '<br/>')
    .replace(/\n/g, '<br/>')
}
