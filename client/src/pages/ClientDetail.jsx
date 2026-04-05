import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getClient, getBuzzwords, getWebAnalytics, updateClient,
  getGa4Properties, addSocialAccount,
} from '../api'
import StatCard from '../components/StatCard'
import PostCard from '../components/PostCard'
import EngagementChart from '../components/EngagementChart'
import PlatformBadge from '../components/PlatformBadge'
import WebAnalyticsSection from '../components/WebAnalyticsSection'
import { useTheme } from '../ThemeContext'

function fmt(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

export default function ClientDetail() {
  const { slug } = useParams()
  const { theme } = useTheme()
  const [client, setClient] = useState(null)
  const [buzzwords, setBuzzwords] = useState([])
  const [webData, setWebData] = useState(null)
  const [tab, setTab] = useState('Social')

  function persistTab(slug, value) {
    try { localStorage.setItem(`ncm_tab_${slug}`, value) } catch {}
  }

  function savedTab(slug) {
    try { return localStorage.getItem(`ncm_tab_${slug}`) } catch { return null }
  }

  // GA4 editing state
  const [isEditingGa, setIsEditingGa] = useState(false)
  const [gaPropertyIdInput, setGaPropertyIdInput] = useState('')
  const [websiteUrlInput, setWebsiteUrlInput] = useState('')
  const [savingGa, setSavingGa] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [ga4Properties, setGa4Properties] = useState([])
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [propertiesError, setPropertiesError] = useState('')

  // Settings panel state
  const [showSettings, setShowSettings] = useState(false)
  const [showSocial, setShowSocial] = useState(false)
  const [socialPlatform, setSocialPlatform] = useState('INSTAGRAM')
  const [socialHandle, setSocialHandle] = useState('')
  const [addingSocial, setAddingSocial] = useState(false)
  const [addSocialError, setAddSocialError] = useState('')
  const settingsRef = useRef(null)

  useEffect(() => {
    setClient(null)
    setWebData(null)
    setShowSettings(false)
    setSocialHandle('')
    setAddSocialError('')
    setIsEditingGa(false)
    setSaveError('')

    getClient(slug)
      .then(clientData => {
        setClient(clientData)
        setGaPropertyIdInput(clientData.gaPropertyId || '')
        setWebsiteUrlInput(clientData.websiteUrl || '')
        const hasSocial = clientData.socialAccounts.length > 0
        setShowSocial(hasSocial)
        const stored = savedTab(slug)
        const defaultTab = hasSocial ? 'Social' : 'Website Analytics'
        const resolvedTab = stored && (stored === 'Social' ? hasSocial : true) ? stored : defaultTab
        setTab(resolvedTab)
      })
      .catch(() => {})

    getBuzzwords(slug).then(setBuzzwords).catch(() => {})
    getWebAnalytics(slug).then(setWebData).catch(() => {})
  }, [slug])

  // Close settings panel on outside click
  useEffect(() => {
    function handleClick(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false)
      }
    }
    if (showSettings) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSettings])

  function extractHandle(platform, raw) {
    const val = raw.trim()
    if (platform === 'INSTAGRAM') return val.replace(/^@/, '')
    // Facebook: accept URL or plain handle
    try {
      const url = new URL(val.includes('://') ? val : `https://facebook.com/${val}`)
      const parts = url.pathname.replace(/\/$/, '').split('/').filter(Boolean)
      // profile.php?id=123 → use the 'id' param
      if (parts[0] === 'profile.php') return url.searchParams.get('id') || parts[0]
      return parts[parts.length - 1] || val
    } catch {
      return val.replace(/^@/, '')
    }
  }

  async function handleAddSocial(e) {
    e.preventDefault()
    const handle = extractHandle(socialPlatform, socialHandle)
    if (!handle) return
    setAddingSocial(true)
    setAddSocialError('')
    try {
      await addSocialAccount(slug, socialPlatform, handle)
      const refreshed = await getClient(slug)
      setClient(refreshed)
      setSocialHandle('')
      setShowSocial(true)
      setTab('Social')
    } catch (err) {
      setAddSocialError(err?.response?.data?.error || 'Failed to add account.')
    } finally {
      setAddingSocial(false)
    }
  }

  async function handleSaveGaLink() {
    setSavingGa(true)
    setSaveError('')
    try {
      const updated = await updateClient(slug, {
        gaPropertyId: gaPropertyIdInput.trim() || null,
        websiteUrl: websiteUrlInput.trim() || null,
      })
      setClient(updated)
      setIsEditingGa(false)
    } catch (err) {
      setSaveError(err?.response?.data?.error || 'Failed to save GA4 details.')
    } finally {
      setSavingGa(false)
    }
  }

  async function handleOpenGaEdit() {
    setIsEditingGa(true)
    setLoadingProperties(true)
    setPropertiesError('')
    try {
      const props = await getGa4Properties()
      setGa4Properties(props || [])
    } catch {
      setPropertiesError('Could not load GA4 properties.')
    } finally {
      setLoadingProperties(false)
    }
  }

  function handleSelectProperty(prop) {
    setGaPropertyIdInput(prop.id)
    if (prop.websiteUrl) setWebsiteUrlInput(prop.websiteUrl)
  }

  function handleToggleSocial(enabled) {
    setShowSocial(enabled)
    if (!enabled && tab === 'Social') { setTab('Website Analytics'); persistTab(slug, 'Website Analytics') }
    if (enabled && tab !== 'Social') { setTab('Social'); persistTab(slug, 'Social') }
  }

  if (!client) {
    return <div className={`p-8 text-sm ${theme.muted}`}>Loading...</div>
  }

  const allPosts = client.socialAccounts
    .flatMap(a => a.posts.map(p => ({ ...p, platform: a.platform })))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))

  const totalLikes     = allPosts.reduce((s, p) => s + (p.metrics?.[0]?.likes         || 0), 0)
  const totalComments  = allPosts.reduce((s, p) => s + (p.metrics?.[0]?.commentsCount || 0), 0)
  const totalReach     = allPosts.reduce((s, p) => s + (p.metrics?.[0]?.reach         || 0), 0)
  const totalFollowers = client.socialAccounts.reduce((s, a) => s + (a.followerCount  || 0), 0)

  const chartData = client.socialAccounts.map(a => ({
    name:   a.handle,
    likes:  a.posts.reduce((s, p) => s + (p.metrics?.[0]?.likes  || 0), 0),
    shares: a.posts.reduce((s, p) => s + (p.metrics?.[0]?.shares || 0), 0),
    saves:  a.posts.reduce((s, p) => s + (p.metrics?.[0]?.saves  || 0), 0),
  }))

  const visibleTabs = showSocial ? ['Social', 'Website Analytics'] : ['Website Analytics']

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: client.avatarColor || '#6366f1' }}
          >
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${theme.heading}`}>{client.name}</h2>
            <div className="flex gap-2 mt-1">
              {client.socialAccounts.map(a => (
                <PlatformBadge key={a.id} platform={a.platform} />
              ))}
              {client.gaPropertyId && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${theme.ga4Badge}`}>GA4</span>
              )}
            </div>
          </div>
        </div>

        {/* Settings gear */}
        <div className="relative" ref={settingsRef}>
          <button
            type="button"
            onClick={() => setShowSettings(v => !v)}
            title="Client settings"
            className={`p-2 rounded-lg border transition-colors ${
              showSettings ? theme.btnGearActive : theme.btnGearInactive
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          {showSettings && (
            <div className={`absolute right-0 top-10 z-50 w-80 rounded-xl border p-4 space-y-4 ${theme.settingsPanel}`}>
              <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme.settingsHeading}`}>Client Settings</p>

              {/* Social tab toggle */}
              <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                <span className={`text-sm ${theme.settingsLabel}`}>Show Social tab</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showSocial}
                  onClick={() => handleToggleSocial(!showSocial)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    showSocial ? theme.toggleOn : theme.toggleOff
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    showSocial ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </button>
              </label>

              {/* Add social account */}
              <form onSubmit={handleAddSocial}>
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] mb-2 ${theme.settingsHeading}`}>Add Social Account</p>
                <div className="flex gap-1 mb-2">
                  {['INSTAGRAM', 'FACEBOOK'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSocialPlatform(p)}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                        socialPlatform === p
                          ? p === 'INSTAGRAM'
                            ? 'border-pink-400 bg-pink-50 text-pink-700'
                            : 'border-blue-400 bg-blue-50 text-blue-700'
                          : `border-gray-200 text-gray-500 hover:bg-gray-50 ${theme.card.includes('gray-700') ? 'bg-gray-700' : 'bg-white'}`
                      }`}
                    >
                      {p === 'INSTAGRAM' ? 'Instagram' : 'Facebook'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={socialHandle}
                    onChange={e => { setSocialHandle(e.target.value); setAddSocialError('') }}
                    placeholder={socialPlatform === 'FACEBOOK' ? 'facebook.com/pagename' : '@handle'}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none ${theme.input}`}
                  />
                  <button
                    type="submit"
                    disabled={addingSocial || !socialHandle.trim()}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${theme.btnPrimary}`}
                  >
                    {addingSocial ? '…' : 'Link'}
                  </button>
                </div>
                {addSocialError && (
                  <p className="mt-1 text-xs text-red-500">{addSocialError}</p>
                )}
              </form>
            </div>
          )}
        </div>
      </div>

      {/* GA4 Card */}
      <div className={`mb-6 rounded-xl border p-4 ${theme.card}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={`text-xs uppercase tracking-[0.2em] ${theme.muted}`}>GA4 connection</p>
            <p className={`text-sm ${theme.body}`}>
              {client.gaPropertyId ? (
                <>Property ID <span className={`font-semibold ${theme.heading}`}>{client.gaPropertyId}</span></>
              ) : (
                <>No GA4 property linked yet.</>
              )}
            </p>
            {client.websiteUrl && (
              <p className={`text-xs mt-1 ${theme.muted}`}>Website: {client.websiteUrl}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleOpenGaEdit}
            className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition ${theme.gaEditBtn}`}
          >
            {client.gaPropertyId ? 'Edit GA4 link' : 'Link GA4 property'}
          </button>
        </div>

        {isEditingGa && (
          <div className="mt-4 space-y-4">
            {loadingProperties && (
              <div className={`text-xs italic ${theme.muted}`}>Loading GA4 properties...</div>
            )}
            {propertiesError && (
              <div className="text-xs text-red-500">{propertiesError}</div>
            )}
            {ga4Properties.length > 0 && !loadingProperties && (
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] mb-2 ${theme.subtext}`}>Available GA4 Properties</p>
                <div className="grid gap-2 mb-4">
                  {ga4Properties.map(prop => (
                    <button
                      key={prop.id}
                      type="button"
                      onClick={() => handleSelectProperty(prop)}
                      className={`w-full text-left rounded-lg border p-3 transition ${theme.gaPropertyBtn}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className={`line-clamp-1 text-sm font-medium ${theme.heading}`}>{prop.displayName}</p>
                          <p className={`text-xs ${theme.muted}`}>ID: {prop.id}</p>
                          {prop.websiteUrl && (
                            <p className={`text-xs line-clamp-1 ${theme.muted}`}>{prop.websiteUrl}</p>
                          )}
                        </div>
                        <input
                          type="radio"
                          checked={gaPropertyIdInput === prop.id}
                          onChange={() => {}}
                          className="mt-0.5 h-4 w-4 flex-shrink-0"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={`block text-sm ${theme.body}`}>
                <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme.subtext}`}>GA4 Property ID</span>
                <input
                  value={gaPropertyIdInput}
                  onChange={e => setGaPropertyIdInput(e.target.value)}
                  placeholder="398788290"
                  className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${theme.input}`}
                />
              </label>
              <label className={`block text-sm ${theme.body}`}>
                <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme.subtext}`}>Website URL</span>
                <input
                  value={websiteUrlInput}
                  onChange={e => setWebsiteUrlInput(e.target.value)}
                  placeholder="https://example.com"
                  className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${theme.input}`}
                />
              </label>
              <div className="sm:col-span-2 flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveGaLink}
                    disabled={savingGa}
                    className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition ${theme.btnPrimary}`}
                  >
                    {savingGa ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingGa(false)
                      setSaveError('')
                      setGaPropertyIdInput(client.gaPropertyId || '')
                      setWebsiteUrlInput(client.websiteUrl || '')
                    }}
                    className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition ${theme.btnCancel}`}
                  >
                    Cancel
                  </button>
                </div>
                {saveError && <p className="text-sm text-red-500">{saveError}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 mb-6 border-b ${theme.tabsBar}`}>
        {visibleTabs.map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); persistTab(slug, t) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t ? theme.tabActive : theme.tabInactive
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Social tab */}
      {tab === 'Social' && showSocial && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-8">
            <StatCard label="Followers"      value={fmt(totalFollowers)} />
            <StatCard label="Total Likes"    value={fmt(totalLikes)} />
            <StatCard label="Total Comments" value={fmt(totalComments)} />
            <StatCard label="Total Reach"    value={fmt(totalReach)} />
          </div>

          {chartData.length > 0 && (
            <div className={`border rounded-xl p-5 mb-8 ${theme.card}`}>
              <h3 className={`text-sm font-semibold mb-4 ${theme.body}`}>Engagement by Account</h3>
              <EngagementChart data={chartData} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-8">
            {client.socialAccounts.map(account => (
              <div key={account.id} className={`border rounded-xl p-5 ${theme.card}`}>
                <div className="flex items-center justify-between mb-3">
                  <PlatformBadge platform={account.platform} />
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    account.tokenStatus === 'ACTIVE' ? theme.tokenStatusActive : theme.tokenStatusInactive
                  }`}>
                    {account.tokenStatus}
                  </span>
                </div>
                <p className={`font-semibold ${theme.heading}`}>@{account.handle}</p>
                <p className={`text-sm mt-0.5 ${theme.muted}`}>{fmt(account.followerCount)} followers</p>
                {account.lastSyncedAt && (
                  <p className={`text-xs mt-1 ${theme.dimmed}`}>
                    Last synced {new Date(account.lastSyncedAt).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>

          {allPosts.length > 0 ? (
            <>
              <h3 className={`text-sm font-semibold mb-3 ${theme.body}`}>Recent Posts</h3>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {allPosts.slice(0, 10).map(post => (
                  <PostCard key={post.id} post={post} platform={post.platform} />
                ))}
              </div>
            </>
          ) : (
            <div className={`text-center text-sm py-10 ${theme.muted}`}>
              No posts synced yet. Run the worker to pull data from connected accounts.
            </div>
          )}

          {buzzwords.length > 0 && (
            <div className={`border rounded-xl p-5 ${theme.card}`}>
              <h3 className={`text-sm font-semibold mb-4 ${theme.body}`}>Top Buzzwords</h3>
              <div className="flex flex-wrap gap-2">
                {buzzwords.slice(0, 30).map(b => (
                  <span
                    key={b.word}
                    className={`px-3 py-1 rounded-full ${theme.buzzword}`}
                    style={{ fontSize: Math.max(11, Math.min(20, 11 + Number(b.total_freq))) + 'px' }}
                  >
                    {b.word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Website Analytics tab */}
      {tab === 'Website Analytics' && (
        <WebAnalyticsSection data={webData} />
      )}
    </div>
  )
}
