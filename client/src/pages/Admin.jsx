import { useState } from 'react'
import { refreshMetaTokens, triggerAutoRefresh } from '../api'
import { useTheme, THEMES } from '../ThemeContext'

function ResultList({ updated, errors, total, theme }) {
  return (
    <div className="mt-4 space-y-3">
      <p className={`text-sm font-semibold ${theme.body}`}>
        {updated.length} account{updated.length !== 1 ? 's' : ''} refreshed
        {errors.length > 0 && <span className="text-red-500 ml-2">· {errors.length} error{errors.length !== 1 ? 's' : ''}</span>}
        <span className={`ml-2 font-normal ${theme.muted}`}>({total} pages found)</span>
      </p>
      <div className="space-y-1.5">
        {updated.map((item, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-2 rounded-lg border text-sm ${theme.resultSuccess}`}>
            <span className="text-green-500 flex-shrink-0">✓</span>
            <span className={`font-medium ${theme.heading}`}>{item.name}</span>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
              item.platform === 'INSTAGRAM' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
            }`}>{item.platform}</span>
            <span className={theme.muted}>@{item.handle}</span>
          </div>
        ))}
        {errors.map((item, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-2 rounded-lg border text-sm ${theme.resultError}`}>
            <span className="text-red-500 flex-shrink-0">✕</span>
            <span className="font-medium text-red-700">{item.name}</span>
            <span className="text-red-400 text-xs">{item.error}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Admin() {
  const { theme, themeKey, setTheme } = useTheme()

  // Auto-refresh state (uses stored .env credentials)
  const [autoLoading, setAutoLoading] = useState(false)
  const [autoResult, setAutoResult] = useState(null)
  const [autoError, setAutoError] = useState('')

  // Manual paste state
  const [token, setToken] = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [manualResult, setManualResult] = useState(null)
  const [manualError, setManualError] = useState('')

  async function handleAutoRefresh() {
    setAutoLoading(true)
    setAutoResult(null)
    setAutoError('')
    try {
      const data = await triggerAutoRefresh()
      setAutoResult(data)
    } catch (err) {
      setAutoError(err?.response?.data?.error || 'Auto-refresh failed. Check that META_APP_ID, META_APP_SECRET, and META_USER_TOKEN are all set in .env.')
    } finally {
      setAutoLoading(false)
    }
  }

  async function handleManualRefresh(e) {
    e.preventDefault()
    if (!token.trim()) return
    setManualLoading(true)
    setManualResult(null)
    setManualError('')
    try {
      const data = await refreshMetaTokens(token.trim())
      setManualResult(data)
      setToken('')
    } catch (err) {
      setManualError(err?.response?.data?.error || 'Request failed.')
    } finally {
      setManualLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h2 className={`text-2xl font-bold mb-1 ${theme.heading}`}>Admin Settings</h2>
      <p className={`text-sm mb-8 ${theme.subtext}`}>Internal configuration for the NCM dashboard.</p>

      {/* ── Dashboard Style ── */}
      <section className={`rounded-xl border p-6 mb-5 ${theme.card}`}>
        <div className="flex items-start gap-3 mb-5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${theme.accentIconBg}`}>
            <svg className={`w-4 h-4 ${theme.accentIconText}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
          </div>
          <div>
            <h3 className={`font-semibold ${theme.heading}`}>Dashboard Style</h3>
            <p className={`text-sm mt-0.5 ${theme.subtext}`}>
              Choose a visual theme for the entire dashboard. Your selection is saved locally.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {Object.values(THEMES).map(t => {
            const isActive = themeKey === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                  isActive
                    ? t.id === 'neon-cactus'
                      ? 'border-fuchsia-400 bg-fuchsia-50 shadow-md shadow-fuchsia-100'
                      : t.id === 'dark'
                        ? 'border-indigo-500 bg-indigo-900'
                        : 'border-indigo-400 bg-indigo-50 shadow-md'
                    : `border-transparent ${theme.card} opacity-70 hover:opacity-100 hover:border-gray-300`
                }`}
              >
                {/* Theme preview swatch */}
                <div className="flex gap-1 mb-3">
                  {t.id === 'default' && (
                    <>
                      <div className="w-5 h-8 rounded bg-gray-900" />
                      <div className="flex-1 h-8 rounded bg-gray-100 flex items-center justify-center">
                        <div className="w-3/4 h-2 rounded bg-white border border-gray-200" />
                      </div>
                    </>
                  )}
                  {t.id === 'neon-cactus' && (
                    <>
                      <div className="w-5 h-8 rounded bg-gray-900 flex items-end pb-1 justify-center">
                        <div className="w-2 h-2 rounded-full bg-lime-400" style={{ boxShadow: '0 0 4px #a3e635' }} />
                      </div>
                      <div className="flex-1 h-8 rounded bg-pink-50 flex items-center justify-center">
                        <div className="w-3/4 h-2 rounded bg-white border border-fuchsia-200" />
                      </div>
                    </>
                  )}
                  {t.id === 'dark' && (
                    <>
                      <div className="w-5 h-8 rounded bg-gray-900" />
                      <div className="flex-1 h-8 rounded bg-gray-800 flex items-center justify-center">
                        <div className="w-3/4 h-2 rounded bg-gray-700 border border-gray-600" />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{t.emoji}</span>
                  <span className={`text-sm font-semibold ${
                    isActive
                      ? t.id === 'dark' ? 'text-indigo-300' : t.id === 'neon-cactus' ? 'text-fuchsia-700' : 'text-indigo-700'
                      : theme.body
                  }`}>{t.name}</span>
                </div>

                {isActive && (
                  <span className={`absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    t.id === 'neon-cactus'
                      ? 'bg-fuchsia-500 text-white'
                      : t.id === 'dark'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-indigo-600 text-white'
                  }`}>✓</span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Auto-refresh ── */}
      <section className={`rounded-xl border p-6 mb-5 ${theme.card}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${theme.accentIconBg}`}>
              <svg className={`w-4 h-4 ${theme.accentIconText}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </div>
            <div>
              <h3 className={`font-semibold ${theme.heading}`}>Auto-Refresh</h3>
              <p className={`text-sm mt-0.5 ${theme.subtext}`}>
                Uses the stored <code className={`text-xs px-1 rounded ${theme.code} ${theme.codeText}`}>META_USER_TOKEN</code> in <code className={`text-xs px-1 rounded ${theme.code} ${theme.codeText}`}>.env</code> to exchange a fresh long-lived token, save it back, and reset all account statuses to Active.
                Runs automatically every <strong>Sunday at 2 AM</strong>.
              </p>
              <p className={`text-xs mt-1.5 ${theme.muted}`}>
                Requires <code className={`px-1 rounded ${theme.code}`}>META_APP_ID</code> and <code className={`px-1 rounded ${theme.code}`}>META_APP_SECRET</code> to also be in .env.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAutoRefresh}
            disabled={autoLoading}
            className={`flex-shrink-0 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${theme.btnOutline}`}
          >
            {autoLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Running…
              </>
            ) : 'Run Now'}
          </button>
        </div>
        {autoError && <p className="mt-3 text-sm text-red-500">{autoError}</p>}
        {autoResult && <ResultList {...autoResult} theme={theme} />}
      </section>

      {/* ── Manual paste ── */}
      <section className={`rounded-xl border p-6 ${theme.card}`}>
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${theme.blueIconBg}`}>
            <svg className={`w-4 h-4 ${theme.blueIconText}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <div>
            <h3 className={`font-semibold ${theme.heading}`}>Manual Token Paste</h3>
            <p className={`text-sm mt-0.5 ${theme.subtext}`}>
              Use this to bootstrap or recover after a full token expiry. Paste a long-lived user token and all accounts will be refreshed immediately.
            </p>
          </div>
        </div>

        <details className="mb-4">
          <summary className={`text-xs font-semibold cursor-pointer select-none hover:opacity-80 ${theme.subtext}`}>
            How to get a long-lived token ›
          </summary>
          <div className={`mt-3 rounded-lg border p-4 text-xs space-y-1.5 ${theme.emptyStateBg}`}>
            <ol className={`list-decimal list-inside space-y-1.5 ${theme.body}`}>
              <li>Go to <span className={`font-mono px-1 rounded border ${theme.code}`}>developers.facebook.com → Graph API Explorer</span></li>
              <li>Generate a User Token with <span className={`font-mono px-1 rounded border ${theme.code}`}>pages_show_list, pages_read_engagement, instagram_basic</span> permissions</li>
              <li>Open a new browser tab and paste this URL:
                <div className={`mt-1 font-mono px-2 py-1.5 rounded border break-all leading-relaxed ${theme.code}`}>
                  https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&amp;client_id=<span className={theme.detailsLink}>APP_ID</span>&amp;client_secret=<span className={theme.detailsLink}>APP_SECRET</span>&amp;fb_exchange_token=<span className={theme.detailsLink}>SHORT_TOKEN</span>
                </div>
              </li>
              <li>Copy the <span className={`font-mono px-1 rounded border ${theme.code}`}>access_token</span> from the response and paste it below</li>
            </ol>
          </div>
        </details>

        <form onSubmit={handleManualRefresh} className="space-y-3">
          <textarea
            value={token}
            onChange={e => { setToken(e.target.value); setManualError('') }}
            placeholder="Paste long-lived user access token here…"
            rows={3}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm font-mono focus:outline-none resize-none ${theme.input}`}
          />
          {manualError && <p className="text-sm text-red-500">{manualError}</p>}
          <button
            type="submit"
            disabled={manualLoading || !token.trim()}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${theme.btnPrimary}`}
          >
            {manualLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Refreshing…
              </>
            ) : 'Refresh Tokens'}
          </button>
        </form>

        {manualResult && <ResultList {...manualResult} theme={theme} />}
      </section>
    </div>
  )
}
