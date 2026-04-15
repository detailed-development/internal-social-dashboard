import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getClient, getBuzzwords, getWebAnalytics, updateClient,
  getGa4Properties, addSocialAccount, getMessages, lookupSocialHandle,
  getClientOverview,
} from '../api'
import StatCard from '../components/StatCard'
import PostCard from '../components/PostCard'
import EngagementChart from '../components/EngagementChart'
import PostTypeBreakdownChart from '../components/PostTypeBreakdownChart'
import EngagementTrendChart from '../components/EngagementTrendChart'
import ContentPillarsPanel from '../components/ContentPillarsPanel'
import PlatformBadge from '../components/PlatformBadge'
import WebAnalyticsSection from '../components/WebAnalyticsSection'
import MessagesSection from '../components/MessagesSection'
import WeeklyInsightsPanel from '../components/ai/WeeklyInsightsPanel'
import StyleGuidePanel from '../components/StyleGuidePanel'
import RuleInsightsPanel from '../components/analytics/RuleInsightsPanel'
import FreshnessBadges from '../components/analytics/FreshnessBadges'
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
  const [overview, setOverview] = useState(null)
  const [buzzwords, setBuzzwords] = useState([])
  const [webData, setWebData] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [tab, setTab] = useState('Social')

  function persistTab(slug, value) {
    try { localStorage.setItem(`ncm_tab_${slug}`, value) } catch {}
  }

  function savedTab(slug) {
    try { return localStorage.getItem(`ncm_tab_${slug}`) } catch { return null }
  }

  // GA4 modal + editing state
  const [ga4ModalOpen, setGa4ModalOpen] = useState(false)
  const [isEditingGa, setIsEditingGa] = useState(false)
  const [gaPropertyIdInput, setGaPropertyIdInput] = useState('')
  const [websiteUrlInput, setWebsiteUrlInput] = useState('')
  const [savingGa, setSavingGa] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [ga4Properties, setGa4Properties] = useState([])
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [propertiesError, setPropertiesError] = useState('')

  // Platform collapse state
  const [collapsedPlatforms, setCollapsedPlatforms] = useState({})

  // Content pillar filter
  const [pillarFilter, setPillarFilter] = useState(null)

  // Settings panel state
  const [showSettings, setShowSettings] = useState(false)
  const [showSocial, setShowSocial] = useState(false)
  const [socialPlatform, setSocialPlatform] = useState('INSTAGRAM')
  const [socialHandle, setSocialHandle] = useState('')
  const [addingSocial, setAddingSocial] = useState(false)
  const [addSocialError, setAddSocialError] = useState('')
  const [handlePreview, setHandlePreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const settingsRef = useRef(null)

  useEffect(() => {
    setClient(null)
    setOverview(null)
    setWebData(null)
    setMessages([])
    setShowSettings(false)
    setSocialHandle('')
    setAddSocialError('')
    setIsEditingGa(false)
    setSaveError('')

    // Fire all independent API calls in parallel
    const clientPromise = getClient(slug)
    const overviewPromise = getClientOverview(slug).then(setOverview).catch(() => {})
    const buzzwordsPromise = getBuzzwords(slug).then(setBuzzwords).catch(() => {})
    const webPromise = getWebAnalytics(slug).then(setWebData).catch(() => {})

    clientPromise
      .then(clientData => {
        setClient(clientData)
        setGaPropertyIdInput(clientData.gaPropertyId || '')
        setWebsiteUrlInput(clientData.websiteUrl || '')
        const hasSocial = clientData.socialAccounts.length > 0
        setShowSocial(hasSocial)
        const stored = savedTab(slug)
        const defaultTab = hasSocial ? 'Social' : 'Website Analytics'
        const validTabs = ['Social', 'Messages', 'Website Analytics', 'AI Insights', 'Style Guide']
        const resolvedTab = stored && validTabs.includes(stored) && (stored === 'Social' ? hasSocial : true) ? stored : defaultTab
        setTab(resolvedTab)

        // Load messages if any IG/FB accounts exist
        if (hasSocial && clientData.socialAccounts.some(a => a.platform === 'INSTAGRAM' || a.platform === 'FACEBOOK')) {
          setMessagesLoading(true)
          getMessages(slug, { includeHidden: true })
            .then(setMessages)
            .catch(() => {})
            .finally(() => setMessagesLoading(false))
        }
      })
      .catch(() => {})
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
    if (platform === 'YOUTUBE') {
      // Accept: @handle, youtube.com/@handle, youtube.com/channel/UC..., bare handle
      try {
        const url = new URL(val.includes('://') ? val : `https://youtube.com/${val}`)
        const parts = url.pathname.replace(/\/$/, '').split('/').filter(Boolean)
        // /channel/UCxxx or /@handle
        const segment = parts[parts.length - 1] || val
        return segment.startsWith('@') ? segment.slice(1) : segment
      } catch {
        return val.replace(/^@/, '')
      }
    }
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

  // Debounced handle preview lookup for IG/FB
  useEffect(() => {
    if (socialPlatform === 'YOUTUBE') { setHandlePreview(null); return }
    const handle = extractHandle(socialPlatform, socialHandle)
    if (!handle || handle.length < 2) { setHandlePreview(null); return }
    const timer = setTimeout(() => {
      setPreviewLoading(true)
      lookupSocialHandle(socialPlatform, handle)
        .then(data => setHandlePreview(data))
        .catch(() => setHandlePreview(null))
        .finally(() => setPreviewLoading(false))
    }, 600)
    return () => clearTimeout(timer)
  }, [socialHandle, socialPlatform])

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
      setHandlePreview(null)
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
      setGa4ModalOpen(false)
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
    if (!enabled && (tab === 'Social' || tab === 'Messages')) { setTab('Website Analytics'); persistTab(slug, 'Website Analytics') }
    if (enabled && tab === 'Website Analytics') { setTab('Social'); persistTab(slug, 'Social') }
  }

  if (!client) {
    return <div className={`p-4 sm:p-8 text-sm ${theme.muted}`}>Loading...</div>
  }

  const allPosts = client.socialAccounts
    .flatMap(a => a.posts.map(p => ({ ...p, platform: a.platform, accountHandle: a.handle })))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))

  // Prefer Layer B overview summary when available; fall back to inline computation.
  const ov = overview?.summary
  const totalLikes     = ov ? (overview.chartData?.platformTotals || []).reduce((s, p) => s + p.likes, 0) : allPosts.reduce((s, p) => s + (p.metrics?.[0]?.likes || 0), 0)
  const totalComments  = ov ? (overview.chartData?.platformTotals || []).reduce((s, p) => s + p.comments, 0) : allPosts.reduce((s, p) => s + (p.metrics?.[0]?.commentsCount || 0), 0)
  const totalReach     = ov ? ov.totalReach : allPosts.reduce((s, p) => s + (p.metrics?.[0]?.reach || 0), 0)
  const totalShares    = ov ? (overview.chartData?.platformTotals || []).reduce((s, p) => s + p.shares, 0) : allPosts.reduce((s, p) => s + (p.metrics?.[0]?.shares || 0), 0)
  const totalSaves     = ov ? (overview.chartData?.platformTotals || []).reduce((s, p) => s + p.saves, 0) : allPosts.reduce((s, p) => s + (p.metrics?.[0]?.saves || 0), 0)
  const totalFollowers = ov ? (overview.chartData?.platformTotals || []).reduce((s, p) => s + p.followers, 0) : client.socialAccounts.reduce((s, a) => s + (a.followerCount || 0), 0)
  const totalEngagement = ov ? ov.totalEngagement : (totalLikes + totalComments + totalShares + totalSaves)
  const engagementRate = totalFollowers > 0 ? ((totalEngagement / (allPosts.length || 1)) / totalFollowers * 100) : 0

  // Group accounts by platform
  const platforms = {}
  for (const account of client.socialAccounts) {
    const key = account.platform
    if (!platforms[key]) platforms[key] = { accounts: [], posts: [] }
    platforms[key].accounts.push(account)
    for (const post of account.posts) {
      platforms[key].posts.push({ ...post, platform: key, accountHandle: account.handle })
    }
  }
  // Sort posts within each platform
  for (const p of Object.values(platforms)) {
    p.posts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  }

  // Engagement-by-account chart: prefer overview when available.
  const chartData = overview?.chartData?.platformTotals
    ? overview.chartData.platformTotals.map(p => ({
        name:   p.handle,
        likes:  p.likes,
        shares: p.shares,
        saves:  p.saves,
      }))
    : client.socialAccounts.map(a => ({
        name:   a.handle,
        likes:  a.posts.reduce((s, p) => s + (p.metrics?.[0]?.likes  || 0), 0),
        shares: a.posts.reduce((s, p) => s + (p.metrics?.[0]?.shares || 0), 0),
        saves:  a.posts.reduce((s, p) => s + (p.metrics?.[0]?.saves  || 0), 0),
      }))

  const hasMessagingAccounts = client.socialAccounts.some(
    a => a.platform === 'INSTAGRAM' || a.platform === 'FACEBOOK'
  )
  const visibleTabs = [
    ...(showSocial ? ['Social'] : []),
    ...(hasMessagingAccounts ? ['Messages'] : []),
    'Website Analytics',
    'AI Insights',
    'Style Guide',
  ]

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
            style={{ backgroundColor: client.avatarColor || '#6366f1' }}
          >
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className={`text-xl font-bold leading-tight ${theme.heading}`}>{client.name}</h2>
            <div className="flex gap-1.5 mt-0.5">
              {client.socialAccounts.map(a => (
                <PlatformBadge key={a.id} platform={a.platform} />
              ))}
              <button
                type="button"
                onClick={() => setGa4ModalOpen(true)}
                className={`text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${client.gaPropertyId ? theme.ga4Badge : 'bg-gray-100 text-gray-400 border border-gray-200'}`}
                title={client.gaPropertyId ? `GA4: ${client.gaPropertyId}` : 'Link GA4 property'}
              >
                GA4
              </button>
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
            <div className={`absolute right-0 top-10 z-50 w-[calc(100vw-2rem)] sm:w-80 max-w-sm rounded-xl border p-4 space-y-4 ${theme.settingsPanel}`}>
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
                  {[
                    { value: 'INSTAGRAM', label: 'Instagram', active: 'border-pink-400 bg-pink-50 text-pink-700' },
                    { value: 'FACEBOOK',  label: 'Facebook',  active: 'border-blue-400 bg-blue-50 text-blue-700' },
                    { value: 'YOUTUBE',   label: 'YouTube',   active: 'border-red-400 bg-red-50 text-red-700' },
                  ].map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => { setSocialPlatform(p.value); setSocialHandle(''); setHandlePreview(null); setAddSocialError('') }}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                        socialPlatform === p.value
                          ? p.active
                          : `border-gray-200 text-gray-500 hover:bg-gray-50 ${theme.card.includes('gray-700') ? 'bg-gray-700' : 'bg-white'}`
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={socialHandle}
                    onChange={e => { setSocialHandle(e.target.value); setAddSocialError('') }}
                    placeholder={
                      socialPlatform === 'FACEBOOK' ? 'facebook.com/pagename'
                      : socialPlatform === 'YOUTUBE' ? '@handle or youtube.com/...'
                      : '@handle'
                    }
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
                {/* Handle preview (IG/FB only) */}
                {(previewLoading || handlePreview) && socialPlatform !== 'YOUTUBE' && (
                  <div className={`mt-2 rounded-lg border p-2 flex items-center gap-2 ${theme.code}`}>
                    {previewLoading ? (
                      <span className={`text-xs ${theme.muted}`}>Looking up…</span>
                    ) : handlePreview && (
                      <>
                        {handlePreview.avatarUrl && (
                          <img src={handlePreview.avatarUrl} alt="" className="w-7 h-7 rounded-full flex-shrink-0 object-cover" />
                        )}
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold truncate ${theme.heading}`}>{handlePreview.displayName || handlePreview.handle}</p>
                          {handlePreview.followerCount != null && (
                            <p className={`text-xs ${theme.muted}`}>{fmt(handlePreview.followerCount)} followers</p>
                          )}
                          {handlePreview.bio && (
                            <p className={`text-xs truncate ${theme.muted}`}>{handlePreview.bio}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {addSocialError && (
                  <p className="mt-1 text-xs text-red-500">{addSocialError}</p>
                )}
              </form>
            </div>
          )}
        </div>
      </div>

      {/* GA4 Modal */}
      {ga4ModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => { setGa4ModalOpen(false); setIsEditingGa(false); setSaveError('') }}
          />
          <div className={`relative w-full max-w-md rounded-2xl border p-6 shadow-xl ${theme.card}`}>
            <div className="flex items-center justify-between mb-4">
              <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${theme.subtext}`}>GA4 Connection</p>
              <button
                type="button"
                onClick={() => { setGa4ModalOpen(false); setIsEditingGa(false); setSaveError('') }}
                className={`p-1 rounded-lg transition-colors ${theme.navItemInactive}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className={`text-sm ${theme.body}`}>
                {client.gaPropertyId ? (
                  <>Property ID <span className={`font-semibold ${theme.heading}`}>{client.gaPropertyId}</span></>
                ) : (
                  <span className={theme.muted}>No GA4 property linked yet.</span>
                )}
              </p>
              {client.websiteUrl && (
                <p className={`text-xs mt-1 ${theme.muted}`}>Website: {client.websiteUrl}</p>
              )}
            </div>

            {!isEditingGa && (
              <button
                type="button"
                onClick={handleOpenGaEdit}
                className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition ${theme.gaEditBtn}`}
              >
                {client.gaPropertyId ? 'Edit GA4 link' : 'Link GA4 property'}
              </button>
            )}

            {isEditingGa && (
              <div className="space-y-4">
                {loadingProperties && (
                  <div className={`text-xs italic ${theme.muted}`}>Loading GA4 properties...</div>
                )}
                {propertiesError && (
                  <div className="text-xs text-red-500">{propertiesError}</div>
                )}
                {ga4Properties.length > 0 && !loadingProperties && (
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] mb-2 ${theme.subtext}`}>Available GA4 Properties</p>
                    <div className="grid gap-2 mb-4 max-h-48 overflow-y-auto">
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
                        onClick={() => { setIsEditingGa(false); setSaveError(''); setGaPropertyIdInput(client.gaPropertyId || ''); setWebsiteUrlInput(client.websiteUrl || '') }}
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
        </div>
      )}

      {/* Global freshness bar */}
      <FreshnessBadges freshness={overview?.freshness} variant="compact" />

      {/* Tabs */}
      <div className={`flex gap-1 mb-6 border-b overflow-x-auto ${theme.tabsBar}`}>
        {visibleTabs.map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); persistTab(slug, t) }}
            className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
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
          {/* Freshness badges + deterministic insights from Layer B */}
          <FreshnessBadges freshness={overview?.freshness} />
          <RuleInsightsPanel ruleInsights={overview?.ruleInsights} />

          {/* Content Pillars */}
          <ContentPillarsPanel
            clientId={client.id}
            posts={allPosts}
            onFilterChange={setPillarFilter}
          />

          {/* Overall stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-8">
            <StatCard label="Followers"       value={fmt(totalFollowers)} />
            <StatCard label="Total Likes"     value={fmt(totalLikes)} />
            <StatCard label="Total Comments"  value={fmt(totalComments)} />
            <StatCard label="Total Reach"     value={fmt(totalReach)} />
            <StatCard label="Engagement Rate" value={engagementRate.toFixed(2) + '%'} sub="avg per post / followers" />
          </div>

          {chartData.length > 0 && (
            <div className={`border rounded-xl p-5 mb-8 ${theme.card}`}>
              <h3 className={`text-sm font-semibold mb-4 ${theme.body}`}>Engagement by Account</h3>
              <EngagementChart data={chartData} />
            </div>
          )}

          {overview?.chartData?.postTypeBreakdown?.length > 0 && (
            <div className={`border rounded-xl p-5 mb-8 ${theme.card}`}>
              <PostTypeBreakdownChart postTypeBreakdown={overview.chartData.postTypeBreakdown} />
            </div>
          )}

          {overview?.chartData?.dailyEngagement?.length > 0 && (
            <div className={`border rounded-xl p-5 mb-8 ${theme.card}`}>
              <EngagementTrendChart dailyEngagement={overview.chartData.dailyEngagement} />
            </div>
          )}

          {/* Buzzwords — above all posts */}
          {buzzwords.length > 0 && (
            <div className={`border rounded-xl p-5 mb-8 ${theme.card}`}>
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

          {/* Per-platform sections — side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {Object.entries(platforms).map(([platformKey, { accounts, posts: platformPosts }]) => {
              const plLikes    = platformPosts.reduce((s, p) => s + (p.metrics?.[0]?.likes         || 0), 0)
              const plComments = platformPosts.reduce((s, p) => s + (p.metrics?.[0]?.commentsCount || 0), 0)
              const plShares   = platformPosts.reduce((s, p) => s + (p.metrics?.[0]?.shares        || 0), 0)
              const plSaves    = platformPosts.reduce((s, p) => s + (p.metrics?.[0]?.saves         || 0), 0)
              const plReach    = platformPosts.reduce((s, p) => s + (p.metrics?.[0]?.reach         || 0), 0)
              const plFollowers = accounts.reduce((s, a) => s + (a.followerCount || 0), 0)
              const plEngagement = plLikes + plComments + plShares + plSaves
              const plER = plFollowers > 0 ? ((plEngagement / (platformPosts.length || 1)) / plFollowers * 100) : 0
              const isCollapsed = collapsedPlatforms[platformKey]

              return (
                <div key={platformKey} className={`border rounded-xl overflow-hidden ${theme.card}`}>
                  {/* Collapsible header */}
                  <button
                    onClick={() => setCollapsedPlatforms(prev => ({ ...prev, [platformKey]: !prev[platformKey] }))}
                    className={`w-full flex items-center justify-between gap-2 px-5 py-4 text-left transition-colors hover:opacity-80`}
                  >
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={platformKey} />
                      <span className={`text-sm font-semibold ${theme.heading}`}>
                        {accounts.map(a => `@${a.handle}`).join(', ')}
                      </span>
                    </div>
                    <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${isCollapsed ? '-rotate-90' : ''} ${theme.muted}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>

                  {!isCollapsed && (
                    <div className="px-5 pb-5 space-y-4">
                      {/* Platform stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <StatCard label="Followers"       value={fmt(plFollowers)} />
                        <StatCard label="Engagement"      value={fmt(plEngagement)} sub={`${fmt(plLikes)} likes · ${fmt(plComments)} comments`} />
                        <StatCard label="Reach"           value={fmt(plReach)} />
                        <StatCard label="Engagement Rate" value={plER.toFixed(2) + '%'} sub={`${platformPosts.length} posts`} />
                      </div>

                      {/* Platform accounts */}
                      {accounts.map(account => (
                        <div key={account.id} className={`border rounded-lg p-4 ${theme.cardDivider}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`font-semibold text-sm ${theme.heading}`}>@{account.handle}</p>
                              <p className={`text-xs ${theme.muted}`}>{fmt(account.followerCount)} followers</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              account.tokenStatus === 'ACTIVE' ? theme.tokenStatusActive : theme.tokenStatusInactive
                            }`}>
                              {account.tokenStatus}
                            </span>
                          </div>
                          {account.lastSyncedAt && (
                            <p className={`text-xs mt-1 ${theme.dimmed}`}>
                              Synced {new Date(account.lastSyncedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ))}

                      {/* Platform posts */}
                      {platformPosts.length > 0 && (() => {
                        const filteredPosts = pillarFilter
                          ? platformPosts.filter(p => p.pillars?.some(pa => pa.contentPillarId === pillarFilter))
                          : platformPosts
                        return filteredPosts.length > 0 ? (
                          <>
                            <h4 className={`text-xs font-semibold uppercase tracking-wider ${theme.muted}`}>
                              Recent Posts{pillarFilter ? ' (filtered by pillar)' : ''}
                            </h4>
                            <div className="space-y-3">
                              {filteredPosts.slice(0, 4).map(post => (
                                <PostCard key={post.id} post={post} platform={post.platform} />
                              ))}
                            </div>
                          </>
                        ) : null
                      })()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {allPosts.length === 0 && (
            <div className={`text-center text-sm py-10 ${theme.muted}`}>
              No posts synced yet. Run the worker to pull data from connected accounts.
            </div>
          )}
        </>
      )}

      {/* Messages tab */}
      {tab === 'Messages' && (
        <MessagesSection conversations={messages} loading={messagesLoading} />
      )}

      {/* Website Analytics tab */}
      {tab === 'Website Analytics' && (
        <WebAnalyticsSection data={webData} />
      )}

      {tab === 'AI Insights' && (
        <WeeklyInsightsPanel clientSlug={slug} clientId={client.id} />
      )}

      {tab === 'Style Guide' && (
        <StyleGuidePanel clientSlug={slug} />
      )}
    </div>
  )
}
