import { useState } from 'react'
import { refreshMetaTokens, triggerAutoRefresh } from '../api'

function ResultList({ updated, errors, total }) {
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-semibold text-gray-700">
        {updated.length} account{updated.length !== 1 ? 's' : ''} refreshed
        {errors.length > 0 && <span className="text-red-500 ml-2">· {errors.length} error{errors.length !== 1 ? 's' : ''}</span>}
        <span className="ml-2 font-normal text-gray-400">({total} pages found)</span>
      </p>
      <div className="space-y-1.5">
        {updated.map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2 rounded-lg border border-green-100 bg-green-50 text-sm">
            <span className="text-green-500 flex-shrink-0">✓</span>
            <span className="font-medium text-gray-900">{item.name}</span>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
              item.platform === 'INSTAGRAM' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
            }`}>{item.platform}</span>
            <span className="text-gray-500">@{item.handle}</span>
          </div>
        ))}
        {errors.map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2 rounded-lg border border-red-100 bg-red-50 text-sm">
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
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Admin Settings</h2>
      <p className="text-sm text-gray-500 mb-8">Internal configuration for the NCM dashboard.</p>

      {/* ── Auto-refresh ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Auto-Refresh</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Uses the stored <code className="text-xs bg-gray-100 px-1 rounded">META_USER_TOKEN</code> in <code className="text-xs bg-gray-100 px-1 rounded">.env</code> to exchange a fresh long-lived token, save it back, and reset all account statuses to Active.
                Runs automatically every <strong>Sunday at 2 AM</strong>.
              </p>
              <p className="text-xs text-gray-400 mt-1.5">
                Requires <code className="bg-gray-100 px-1 rounded">META_APP_ID</code> and <code className="bg-gray-100 px-1 rounded">META_APP_SECRET</code> to also be in .env.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAutoRefresh}
            disabled={autoLoading}
            className="flex-shrink-0 inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        {autoResult && <ResultList {...autoResult} />}
      </section>

      {/* ── Manual paste ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Manual Token Paste</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Use this to bootstrap or recover after a full token expiry. Paste a long-lived user token and all accounts will be refreshed immediately.
            </p>
          </div>
        </div>

        <details className="mb-4">
          <summary className="text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 select-none">
            How to get a long-lived token ›
          </summary>
          <div className="mt-3 bg-gray-50 rounded-lg border border-gray-200 p-4 text-xs text-gray-600 space-y-1.5">
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Go to <span className="font-mono bg-white px-1 rounded border border-gray-200">developers.facebook.com → Graph API Explorer</span></li>
              <li>Generate a User Token with <span className="font-mono bg-white px-1 rounded border border-gray-200">pages_show_list, pages_read_engagement, instagram_basic</span> permissions</li>
              <li>Open a new browser tab and paste this URL:
                <div className="mt-1 font-mono bg-white px-2 py-1.5 rounded border border-gray-200 break-all leading-relaxed">
                  https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&amp;client_id=<span className="text-indigo-600">APP_ID</span>&amp;client_secret=<span className="text-indigo-600">APP_SECRET</span>&amp;fb_exchange_token=<span className="text-indigo-600">SHORT_TOKEN</span>
                </div>
              </li>
              <li>Copy the <span className="font-mono bg-white px-1 rounded border border-gray-200">access_token</span> from the response and paste it below</li>
            </ol>
          </div>
        </details>

        <form onSubmit={handleManualRefresh} className="space-y-3">
          <textarea
            value={token}
            onChange={e => { setToken(e.target.value); setManualError('') }}
            placeholder="Paste long-lived user access token here…"
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-mono text-gray-900 focus:border-indigo-500 focus:outline-none resize-none"
          />
          {manualError && <p className="text-sm text-red-500">{manualError}</p>}
          <button
            type="submit"
            disabled={manualLoading || !token.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
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

        {manualResult && <ResultList {...manualResult} />}
      </section>
    </div>
  )
}
