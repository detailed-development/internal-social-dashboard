import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  updateClient,
  getGa4Properties, addSocialAccount, removeSocialAccount, lookupSocialHandle,
  getPlatformAppPassword, updatePlatformAppPassword, deletePlatformAppPasswordHistory,
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
import { useClientDetail } from '../hooks/useClientDetail'

function fmt(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

export default function ClientDetail() {
  const { slug } = useParams()
  const { theme } = useTheme()
  const {
    client,
    setClient,
    refreshClient,
    overview,
    webData,
    messages,
    messagesLoading,
    tab,
    showSocial,
    setShowSocial,
    tabVisibility,
    collapsedPlatforms,
    pillarFilter,
    pillars,
    tagOpenPostId,
    chartTab,
    buzzOpen,
    platformsOpen,
    setActiveTab,
    setPillars,
    setPillarFilter,
    setTagOpenPostId,
    setChartTab,
    setBuzzOpen,
    setPlatformsOpen,
    setCollapsedPlatforms,
    applyPostPillarChange,
    handleTagPost,
    handleToggleTab,
    allPosts,
    totalLikes,
    totalComments,
    totalReach,
    totalFollowers,
    engagementRate,
    platforms,
    visibleTabs,
    filteredBuzz,
    chartData,
    chartPostTypeBreakdown,
    chartTabs,
    activePillarForChart,
    hasMessagingAccounts,
    hasTrendData,
    hasCharts,
  } = useClientDetail(slug)

  // GA4 modal state
  const [ga4ModalOpen, setGa4ModalOpen] = useState(false)
  const [isEditingGa, setIsEditingGa] = useState(false)
  const [gaPropertyIdInput, setGaPropertyIdInput] = useState('')
  const [websiteUrlInput, setWebsiteUrlInput] = useState('')
  const [savingGa, setSavingGa] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [ga4Properties, setGa4Properties] = useState([])
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [propertiesError, setPropertiesError] = useState('')

  // Social account modal state
  const [socialModal, setSocialModal] = useState(null) // socialAccount object
  const [isEditingHandle, setIsEditingHandle] = useState(false)
  const [editHandleInput, setEditHandleInput] = useState('')
  const [editHandleLoading, setEditHandleLoading] = useState(false)
  const [editHandleError, setEditHandleError] = useState('')
  const [editHandlePreview, setEditHandlePreview] = useState(null)
  const [editHandlePreviewLoading, setEditHandlePreviewLoading] = useState(false)

  // App Password state (per-client + per-platform, modal-scoped)
  const [appPasswordData, setAppPasswordData] = useState(null)
  const [appPasswordRevealed, setAppPasswordRevealed] = useState(false)
  const [appPasswordEditing, setAppPasswordEditing] = useState(false)
  const [appPasswordInput, setAppPasswordInput] = useState('')
  const [appPasswordChangedBy, setAppPasswordChangedBy] = useState('')
  const [appPasswordSaving, setAppPasswordSaving] = useState(false)
  const [appPasswordError, setAppPasswordError] = useState('')
  const [appPasswordDeletingId, setAppPasswordDeletingId] = useState('')
  const [appPasswordHistoryHoverId, setAppPasswordHistoryHoverId] = useState(null)
  const [appPasswordHistoryHoverCard, setAppPasswordHistoryHoverCard] = useState(null)

  // Settings panel state
  const [showSettings, setShowSettings] = useState(false)
  const [socialPlatform, setSocialPlatform] = useState('INSTAGRAM')
  const [socialHandle, setSocialHandle] = useState('')
  const [addingSocial, setAddingSocial] = useState(false)
  const [addSocialError, setAddSocialError] = useState('')
  const [handlePreview, setHandlePreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const settingsRef = useRef(null)
  const appPasswordHistoryHideTimeoutRef = useRef(null)

  useEffect(() => {
    setShowSettings(false)
    setSocialHandle('')
    setAddSocialError('')
    setIsEditingGa(false)
    setSaveError('')
    setSocialModal(null)
    setIsEditingHandle(false)
  }, [slug])

  useEffect(() => {
    if (!client) return
    setGaPropertyIdInput(client.gaPropertyId || '')
    setWebsiteUrlInput(client.websiteUrl || '')
  }, [client])

  // Close settings on outside click
  useEffect(() => {
    function handleClick(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false)
      }
    }
    if (showSettings) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSettings])

  // Close pillar tag menu on outside click
  useEffect(() => {
    if (!tagOpenPostId) return
    function close() { setTagOpenPostId(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [tagOpenPostId])

  function extractHandle(platform, raw) {
    const val = raw.trim()
    if (platform === 'INSTAGRAM') return val.replace(/^@/, '')
    if (platform === 'LINKEDIN') {
      try {
        const url = new URL(val.includes('://') ? val : `https://linkedin.com/${val}`)
        const parts = url.pathname.replace(/\/$/, '').split('/').filter(Boolean)
        if ((parts[0] === 'in' || parts[0] === 'company') && parts[1]) return parts[1]
        return parts[parts.length - 1] || val.replace(/^@/, '')
      } catch {
        return val.replace(/^@/, '')
      }
    }
    if (platform === 'YOUTUBE') {
      try {
        const url = new URL(val.includes('://') ? val : `https://youtube.com/${val}`)
        const parts = url.pathname.replace(/\/$/, '').split('/').filter(Boolean)
        const segment = parts[parts.length - 1] || val
        return segment.startsWith('@') ? segment.slice(1) : segment
      } catch {
        return val.replace(/^@/, '')
      }
    }
    // Facebook
    try {
      const url = new URL(val.includes('://') ? val : `https://facebook.com/${val}`)
      const parts = url.pathname.replace(/\/$/, '').split('/').filter(Boolean)
      if (parts[0] === 'profile.php') return url.searchParams.get('id') || parts[0]
      return parts[parts.length - 1] || val
    } catch {
      return val.replace(/^@/, '')
    }
  }

  // Debounced preview for add-social settings form
  useEffect(() => {
    if (socialPlatform === 'YOUTUBE' || socialPlatform === 'LINKEDIN') { setHandlePreview(null); return }
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

  // Load App Password + history when social account modal opens
  useEffect(() => {
    if (!socialModal) {
      setAppPasswordData(null)
      setAppPasswordRevealed(false)
      setAppPasswordEditing(false)
      setAppPasswordInput('')
      setAppPasswordChangedBy('')
      setAppPasswordError('')
      setAppPasswordDeletingId('')
      setAppPasswordHistoryHoverId(null)
      setAppPasswordHistoryHoverCard(null)
      return
    }
    getPlatformAppPassword(slug, socialModal.platform)
      .then(data => {
        setAppPasswordData(data)
        setAppPasswordError('')
        setAppPasswordDeletingId('')
        setAppPasswordHistoryHoverId(null)
        setAppPasswordHistoryHoverCard(null)
      })
      .catch(() => setAppPasswordData(null))
  }, [slug, socialModal])

  useEffect(() => {
    return () => {
      if (appPasswordHistoryHideTimeoutRef.current) {
        clearTimeout(appPasswordHistoryHideTimeoutRef.current)
      }
    }
  }, [])

  async function handleSaveAppPassword(e) {
    e.preventDefault()
    if (!socialModal) return
    setAppPasswordSaving(true)
    setAppPasswordError('')
    try {
      const data = await updatePlatformAppPassword(slug, socialModal.platform, {
        password: appPasswordInput,
        changedBy: appPasswordChangedBy.trim() || null,
      })
      setAppPasswordData(data)
      setAppPasswordEditing(false)
      setAppPasswordInput('')
      setAppPasswordChangedBy('')
    } catch (err) {
      setAppPasswordError(err?.response?.data?.error || 'Failed to save password.')
    } finally {
      setAppPasswordSaving(false)
    }
  }

  async function handleDeleteAppPasswordHistory(historyEntry) {
    if (!socialModal) return
    const changedAt = new Date(historyEntry.changedAt).toLocaleString()
    if (!window.confirm(`Remove the password version saved on ${changedAt}?`)) return

    setAppPasswordDeletingId(historyEntry.id)
    setAppPasswordError('')
    try {
      const data = await deletePlatformAppPasswordHistory(slug, socialModal.platform, historyEntry.id)
      setAppPasswordData(data)
      setAppPasswordHistoryHoverId(null)
      setAppPasswordHistoryHoverCard(null)
    } catch (err) {
      setAppPasswordError(err?.response?.data?.error || 'Failed to remove password version.')
    } finally {
      setAppPasswordDeletingId('')
    }
  }

  function clearAppPasswordHistoryHideTimeout() {
    if (appPasswordHistoryHideTimeoutRef.current) {
      clearTimeout(appPasswordHistoryHideTimeoutRef.current)
      appPasswordHistoryHideTimeoutRef.current = null
    }
  }

  function hideAppPasswordHistoryHover() {
    clearAppPasswordHistoryHideTimeout()
    setAppPasswordHistoryHoverId(null)
    setAppPasswordHistoryHoverCard(null)
  }

  function scheduleAppPasswordHistoryHoverHide() {
    clearAppPasswordHistoryHideTimeout()
    appPasswordHistoryHideTimeoutRef.current = setTimeout(() => {
      setAppPasswordHistoryHoverId(null)
      setAppPasswordHistoryHoverCard(null)
    }, 120)
  }

  function showAppPasswordHistoryHover(historyEntry, target) {
    clearAppPasswordHistoryHideTimeout()
    const rect = target.getBoundingClientRect()
    const cardWidth = Math.min(280, window.innerWidth - 32)
    const estimatedCardHeight = 168
    const left = Math.min(
      Math.max(16, rect.right - cardWidth),
      window.innerWidth - cardWidth - 16,
    )
    const top = rect.bottom + estimatedCardHeight + 12 <= window.innerHeight
      ? rect.bottom + 8
      : Math.max(16, rect.top - estimatedCardHeight - 8)

    setAppPasswordHistoryHoverId(historyEntry.id)
    setAppPasswordHistoryHoverCard({
      entry: historyEntry,
      left,
      top,
      width: cardWidth,
    })
  }

  // Debounced preview for edit-handle modal
  useEffect(() => {
    if (!isEditingHandle || !socialModal) return
    const plat = socialModal.platform
    if (plat === 'YOUTUBE' || plat === 'LINKEDIN') { setEditHandlePreview(null); return }
    const handle = extractHandle(plat, editHandleInput)
    if (!handle || handle.length < 2) { setEditHandlePreview(null); return }
    const timer = setTimeout(() => {
      setEditHandlePreviewLoading(true)
      lookupSocialHandle(plat, handle)
        .then(d => setEditHandlePreview(d))
        .catch(() => setEditHandlePreview(null))
        .finally(() => setEditHandlePreviewLoading(false))
    }, 600)
    return () => clearTimeout(timer)
  }, [editHandleInput, socialModal, isEditingHandle])

  async function handleAddSocial(e) {
    e.preventDefault()
    const handle = extractHandle(socialPlatform, socialHandle)
    if (!handle) return
    setAddingSocial(true)
    setAddSocialError('')
    try {
      await addSocialAccount(slug, socialPlatform, handle)
      await refreshClient()
      setSocialHandle('')
      setHandlePreview(null)
      setShowSocial(true)
      setActiveTab('Social')
    } catch (err) {
      setAddSocialError(err?.response?.data?.error || 'Failed to add account.')
    } finally {
      setAddingSocial(false)
    }
  }

  async function handleSaveHandle(e) {
    e.preventDefault()
    const handle = extractHandle(socialModal.platform, editHandleInput)
    if (!handle) return
    setEditHandleLoading(true)
    setEditHandleError('')
    try {
      await addSocialAccount(slug, socialModal.platform, handle)
      await refreshClient()
      setSocialModal(null)
      setIsEditingHandle(false)
      setEditHandleInput('')
      setEditHandlePreview(null)
    } catch (err) {
      setEditHandleError(err?.response?.data?.error || 'Failed to update handle.')
    } finally {
      setEditHandleLoading(false)
    }
  }

  const previousAppPasswordHistory = appPasswordData?.history?.slice(1) || []

  async function handleRemovePendingAccount() {
    if (!socialModal || socialModal.tokenStatus !== 'PENDING') return
    if (!window.confirm(`Remove @${socialModal.handle} from this client?`)) return
    try {
      await removeSocialAccount(slug, socialModal.id)
      const nextHasSocial = client.socialAccounts.length > 1
      setClient(prev => prev && ({
        ...prev,
        socialAccounts: prev.socialAccounts.filter(a => a.id !== socialModal.id),
      }))
      setShowSocial(nextHasSocial)
      if (!nextHasSocial && (tab === 'Social' || tab === 'Messages')) {
        setActiveTab('Website Analytics')
      }
      setSocialModal(null)
      setIsEditingHandle(false)
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to remove account.')
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

  if (!client) {
    return <div className={`p-4 sm:p-8 text-sm ${theme.muted}`}>Loading...</div>
  }

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
            <div className="flex gap-1.5 mt-0.5 flex-wrap">
              {client.socialAccounts.map(a => (
                <PlatformBadge
                  key={a.id}
                  platform={a.platform}
                  onClick={() => {
                    setSocialModal(a)
                    setIsEditingHandle(false)
                    setEditHandleInput('')
                    setEditHandlePreview(null)
                    setEditHandleError('')
                  }}
                />
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

              <div className="space-y-2">
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme.settingsHeading}`}>Visible Tabs</p>
                {[
                  { key: 'Social', checked: showSocial },
                  { key: 'Messages', checked: tabVisibility.Messages, disabled: !hasMessagingAccounts, disabledNote: 'no IG/FB accounts' },
                  { key: 'Website Analytics', checked: tabVisibility['Website Analytics'] },
                  { key: 'AI Insights', checked: tabVisibility['AI Insights'] },
                  { key: 'Style Guide', checked: tabVisibility['Style Guide'] },
                ].map(t => (
                  <label key={t.key} className={`flex items-center justify-between gap-3 select-none ${t.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                    <span className={`text-sm ${theme.settingsLabel} ${t.disabled ? 'opacity-50' : ''}`}>
                      {t.key}
                      {t.disabled && <span className="text-xs ml-1">({t.disabledNote})</span>}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={t.checked}
                      disabled={t.disabled}
                      onClick={() => handleToggleTab(t.key, !t.checked)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${t.checked ? theme.toggleOn : theme.toggleOff} ${t.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${t.checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                ))}
              </div>

              <form onSubmit={handleAddSocial}>
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] mb-2 ${theme.settingsHeading}`}>Add Social Account</p>
                <div className="flex gap-1 mb-2 flex-wrap">
                  {[
                    { value: 'INSTAGRAM', label: 'Instagram', active: 'border-pink-400 bg-pink-50 text-pink-700' },
                    { value: 'FACEBOOK',  label: 'Facebook',  active: 'border-blue-400 bg-blue-50 text-blue-700' },
                    { value: 'YOUTUBE',   label: 'YouTube',   active: 'border-red-400 bg-red-50 text-red-700' },
                    { value: 'LINKEDIN',  label: 'LinkedIn',  active: 'border-cyan-400 bg-cyan-50 text-cyan-700' },
                  ].map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => { setSocialPlatform(p.value); setSocialHandle(''); setHandlePreview(null); setAddSocialError('') }}
                      className={`flex-1 min-w-[4rem] rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                        socialPlatform === p.value
                          ? p.active
                          : theme.id === 'dark'
                            ? 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
                            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
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
                      : socialPlatform === 'LINKEDIN' ? 'linkedin.com/in/username'
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
                {(previewLoading || handlePreview) && socialPlatform !== 'YOUTUBE' && socialPlatform !== 'LINKEDIN' && (
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
                {addSocialError && <p className="mt-1 text-xs text-red-500">{addSocialError}</p>}
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
                {loadingProperties && <div className={`text-xs italic ${theme.muted}`}>Loading GA4 properties...</div>}
                {propertiesError && <div className="text-xs text-red-500">{propertiesError}</div>}
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
                            <input type="radio" checked={gaPropertyIdInput === prop.id} onChange={() => {}} className="mt-0.5 h-4 w-4 flex-shrink-0" />
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

      {/* Social Account Modal */}
      {socialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => { setSocialModal(null); setIsEditingHandle(false); setEditHandleInput(''); setEditHandlePreview(null) }}
          />
          <div className={`relative w-full max-w-md rounded-2xl border p-6 shadow-xl ${theme.card}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PlatformBadge platform={socialModal.platform} />
                <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${theme.subtext}`}>Account</p>
              </div>
              <button
                type="button"
                onClick={() => { setSocialModal(null); setIsEditingHandle(false); setEditHandleInput(''); setEditHandlePreview(null) }}
                className={`p-1 rounded-lg transition-colors ${theme.navItemInactive}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 space-y-1">
              <p className={`text-sm ${theme.body}`}>
                Handle: <span className={`font-semibold ${theme.heading}`}>@{socialModal.handle}</span>
              </p>
              <p className={`text-xs ${theme.muted}`}>{fmt(socialModal.followerCount)} followers</p>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                socialModal.tokenStatus === 'ACTIVE' ? theme.tokenStatusActive : theme.tokenStatusInactive
              }`}>
                {socialModal.tokenStatus}
              </span>
              {socialModal.lastSyncedAt && (
                <p className={`text-xs ${theme.muted}`}>
                  Last synced {new Date(socialModal.lastSyncedAt).toLocaleString()}
                </p>
              )}
            </div>

            {!isEditingHandle && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => { setIsEditingHandle(true); setEditHandleInput('') }}
                  className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition ${theme.gaEditBtn}`}
                >
                  Change Handle
                </button>
                {socialModal.tokenStatus === 'PENDING' && (
                  <button
                    type="button"
                    onClick={handleRemovePendingAccount}
                    className="inline-flex items-center justify-center rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 transition"
                  >
                    Remove account
                  </button>
                )}
              </div>
            )}

            {isEditingHandle && (
              <form onSubmit={handleSaveHandle} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={editHandleInput}
                    onChange={e => { setEditHandleInput(e.target.value); setEditHandleError('') }}
                    placeholder={
                      socialModal.platform === 'FACEBOOK' ? 'facebook.com/pagename'
                      : socialModal.platform === 'YOUTUBE' ? '@handle or youtube.com/...'
                      : socialModal.platform === 'LINKEDIN' ? 'linkedin.com/in/username'
                      : '@handle'
                    }
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none ${theme.input}`}
                  />
                  <button
                    type="submit"
                    disabled={editHandleLoading || !editHandleInput.trim()}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${theme.btnPrimary}`}
                  >
                    {editHandleLoading ? '…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsEditingHandle(false); setEditHandleInput(''); setEditHandlePreview(null); setEditHandleError('') }}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${theme.btnCancel}`}
                  >
                    Cancel
                  </button>
                </div>
                {(editHandlePreviewLoading || editHandlePreview) && socialModal.platform !== 'YOUTUBE' && socialModal.platform !== 'LINKEDIN' && (
                  <div className={`rounded-lg border p-2 flex items-center gap-2 ${theme.code}`}>
                    {editHandlePreviewLoading ? (
                      <span className={`text-xs ${theme.muted}`}>Looking up…</span>
                    ) : editHandlePreview && (
                      <>
                        {editHandlePreview.avatarUrl && (
                          <img src={editHandlePreview.avatarUrl} alt="" className="w-7 h-7 rounded-full flex-shrink-0 object-cover" />
                        )}
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold truncate ${theme.heading}`}>{editHandlePreview.displayName || editHandlePreview.handle}</p>
                          {editHandlePreview.followerCount != null && (
                            <p className={`text-xs ${theme.muted}`}>{fmt(editHandlePreview.followerCount)} followers</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {editHandleError && <p className="text-xs text-red-500">{editHandleError}</p>}
              </form>
            )}

            {/* App Password — locked/obfuscated by default, editable with version history */}
            <div className={`mt-5 pt-4 border-t ${theme.cardDivider}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme.subtext}`}>
                  App Password
                </p>
                {appPasswordData?.password && !appPasswordEditing && (
                  <button
                    type="button"
                    onClick={() => setAppPasswordRevealed(v => !v)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${theme.navItemInactive}`}
                  >
                    {appPasswordRevealed ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>

              {!appPasswordEditing && (
                <div className="space-y-2">
                  <div className={`rounded-lg border px-3 py-2 font-mono text-xs break-all ${theme.code} ${theme.body}`}>
                    {appPasswordData?.password
                      ? (appPasswordRevealed ? appPasswordData.password : '•'.repeat(Math.min(24, appPasswordData.password.length)))
                      : <span className={theme.muted}>No password saved yet.</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAppPasswordEditing(true)
                      setAppPasswordInput(appPasswordData?.password || '')
                      setAppPasswordChangedBy('')
                      setAppPasswordError('')
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${theme.gaEditBtn}`}
                  >
                    {appPasswordData?.password ? 'Update password' : 'Set password'}
                  </button>
                  {appPasswordError && <p className="text-xs text-red-500">{appPasswordError}</p>}
                </div>
              )}

              {appPasswordEditing && (
                <form onSubmit={handleSaveAppPassword} className="space-y-2">
                  <textarea
                    autoFocus
                    value={appPasswordInput}
                    onChange={e => setAppPasswordInput(e.target.value)}
                    placeholder="Paste or type the new app password"
                    rows={3}
                    className={`w-full rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none ${theme.input}`}
                  />
                  <input
                    type="text"
                    value={appPasswordChangedBy}
                    onChange={e => setAppPasswordChangedBy(e.target.value)}
                    placeholder="Your name (optional)"
                    className={`w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none ${theme.input}`}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={appPasswordSaving}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${theme.btnPrimary}`}
                    >
                      {appPasswordSaving ? 'Saving…' : 'Save password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAppPasswordEditing(false); setAppPasswordInput(''); setAppPasswordError('') }}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${theme.btnCancel}`}
                    >
                      Cancel
                    </button>
                  </div>
                  {appPasswordError && <p className="text-xs text-red-500">{appPasswordError}</p>}
                </form>
              )}

              {previousAppPasswordHistory.length > 0 && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${theme.muted}`}>
                      Previous Changes
                    </p>
                    <span className={`text-[10px] ${theme.muted}`}>Hover to preview or remove</span>
                  </div>
                  <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {previousAppPasswordHistory.map(h => {
                      const isDeleting = appPasswordDeletingId === h.id
                      return (
                        <li
                          key={h.id}
                          tabIndex={0}
                          onMouseEnter={e => showAppPasswordHistoryHover(h, e.currentTarget)}
                          onMouseLeave={scheduleAppPasswordHistoryHoverHide}
                          onFocus={e => showAppPasswordHistoryHover(h, e.currentTarget)}
                          onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget)) {
                              scheduleAppPasswordHistoryHoverHide()
                            }
                          }}
                          className={`text-[11px] px-2 py-1.5 rounded border border-transparent outline-none ${theme.code} ${theme.body}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">
                              {h.changedBy || 'Unknown user'}
                            </span>
                            <span className={`shrink-0 ${theme.muted}`}>
                              {new Date(h.changedAt).toLocaleString()}
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  {appPasswordHistoryHoverCard && (
                    <div
                      className={`fixed z-[70] rounded-xl border p-3 shadow-xl ${theme.card}`}
                      style={{
                        top: `${appPasswordHistoryHoverCard.top}px`,
                        left: `${appPasswordHistoryHoverCard.left}px`,
                        width: `${appPasswordHistoryHoverCard.width}px`,
                      }}
                      onMouseEnter={clearAppPasswordHistoryHideTimeout}
                      onMouseLeave={scheduleAppPasswordHistoryHoverHide}
                    >
                      <p className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${theme.subtext}`}>
                        Saved Value
                      </p>
                      <div className={`font-mono text-[11px] break-all ${theme.codeText || theme.body}`}>
                        {appPasswordHistoryHoverCard.entry.password || <span className={theme.muted}>Empty password</span>}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeleteAppPasswordHistory(appPasswordHistoryHoverCard.entry)}
                          disabled={!!appPasswordDeletingId}
                          className={`text-[10px] px-2 py-1 rounded border font-semibold transition-colors ${theme.btnCancel}`}
                        >
                          {appPasswordDeletingId === appPasswordHistoryHoverCard.entry.id ? 'Removing…' : 'Remove version'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compact freshness bar — hover reveals details */}
      <FreshnessBadges freshness={overview?.freshness} variant="compact" />

      {/* Tabs */}
      <div className={`flex gap-1 mb-6 border-b overflow-x-auto ${theme.tabsBar}`}>
        {visibleTabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === t ? theme.tabActive : theme.tabInactive
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Social tab ── */}
      {tab === 'Social' && showSocial && (
        <>
          <RuleInsightsPanel ruleInsights={overview?.ruleInsights} />

          {/* Overall stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-8">
            <StatCard label="Followers"       value={fmt(totalFollowers)} />
            <StatCard label="Total Likes"     value={fmt(totalLikes)} />
            <StatCard label="Total Comments"  value={fmt(totalComments)} />
            <StatCard label="Total Reach"     value={fmt(totalReach)} />
            <StatCard label="Engagement Rate" value={engagementRate.toFixed(2) + '%'} sub="avg per post / followers" />
          </div>

          {/* Combined charts panel */}
          {hasCharts && (
            <div className={`border rounded-xl p-5 mb-8 ${theme.card}`}>
              {/* Chart header: engagement rate badge + pillar filter */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-semibold ${theme.heading}`}>Charts</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${theme.code} ${theme.muted}`}>
                    {engagementRate.toFixed(2)}% engagement rate
                  </span>
                  {activePillarForChart && (
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
                      style={{ backgroundColor: activePillarForChart.color || '#6366f1' }}
                    >
                      {activePillarForChart.name}
                    </span>
                  )}
                </div>
                {pillars.length > 0 && (
                  <select
                    value={pillarFilter || ''}
                    onChange={e => setPillarFilter(e.target.value || null)}
                    className={`text-xs rounded-lg border px-2 py-1 focus:outline-none ${theme.input}`}
                  >
                    <option value="">All content</option>
                    {pillars.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Chart sub-tabs */}
              {chartTabs.length > 1 && (
                <div className="flex gap-1 mb-4">
                  {chartTabs.map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setChartTab(t.key)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        chartTab === t.key ? theme.btnPrimary : theme.navItemInactive
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {(chartTab === 'account' || chartTabs.length === 1) && chartData.length > 0 && (
                <EngagementChart data={chartData} />
              )}
              {chartTab === 'type' && chartPostTypeBreakdown.length > 0 && (
                <PostTypeBreakdownChart postTypeBreakdown={chartPostTypeBreakdown} />
              )}
              {chartTab === 'trend' && hasTrendData && (
                <EngagementTrendChart dailyEngagement={overview.chartData.dailyEngagement} />
              )}
            </div>
          )}

          {/* Content Pillars — below charts */}
          <ContentPillarsPanel
            clientId={client.id}
            posts={allPosts}
            onFilterChange={setPillarFilter}
            onPillarsChange={setPillars}
            onPostPillarChange={applyPostPillarChange}
          />

          {/* Buzzwords — collapsible, closed on initial load */}
          {filteredBuzz.length > 0 && (
            <div className={`border rounded-xl mb-6 overflow-hidden ${theme.card}`}>
              <button
                type="button"
                onClick={() => setBuzzOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors hover:opacity-80"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${theme.heading}`}>Buzzwords</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${theme.code} ${theme.muted}`}>
                    {filteredBuzz.length}
                  </span>
                </div>
                <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${buzzOpen ? '' : '-rotate-90'} ${theme.muted}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {buzzOpen && (
                <div className={`border-t px-4 py-3 ${theme.cardDivider}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {filteredBuzz.slice(0, 20).map(b => (
                      <span
                        key={b.word}
                        className={`px-2 py-0.5 rounded-full text-xs ${theme.buzzword}`}
                      >
                        {b.word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Per-platform sections */}
          {Object.keys(platforms).length > 0 && (
            <div className={`border rounded-xl mb-6 overflow-hidden ${theme.card}`}>
              <button
                type="button"
                onClick={() => setPlatformsOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors hover:opacity-80"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${theme.heading}`}>Social Platforms</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${theme.code} ${theme.muted}`}>
                    {Object.keys(platforms).length}
                  </span>
                </div>
                <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${platformsOpen ? '' : '-rotate-90'} ${theme.muted}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {platformsOpen && (
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
                        <button
                          onClick={() => setCollapsedPlatforms(prev => ({ ...prev, [platformKey]: !prev[platformKey] }))}
                          className="w-full flex items-center justify-between gap-2 px-5 py-4 text-left transition-colors hover:opacity-80"
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
                            <div className="grid grid-cols-2 gap-3">
                              <StatCard label="Followers"       value={fmt(plFollowers)} />
                              <StatCard label="Engagement"      value={fmt(plEngagement)} sub={`${fmt(plLikes)} likes · ${fmt(plComments)} comments`} />
                              <StatCard label="Reach"           value={fmt(plReach)} />
                              <StatCard label="Engagement Rate" value={plER.toFixed(2) + '%'} sub={`${platformPosts.length} posts`} />
                            </div>

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

                            {platformPosts.length > 0 && (() => {
                              const platformFilteredPosts = pillarFilter
                                ? platformPosts.filter(p => p.pillars?.some(pa => pa.contentPillarId === pillarFilter))
                                : platformPosts
                              return platformFilteredPosts.length > 0 ? (
                                <>
                                  <h4 className={`text-xs font-semibold uppercase tracking-wider ${theme.muted}`}>
                                    Recent Posts{pillarFilter ? ' (filtered by pillar)' : ''}
                                  </h4>
                                  <div className="space-y-4">
                                    {platformFilteredPosts.slice(0, 4).map(post => {
                                      const isTagOpen = tagOpenPostId === post.id
                                      const assignedPillars = pillars.filter(p =>
                                        post.pillars?.some(pa => pa.contentPillarId === p.id)
                                      )
                                      return (
                                        <div key={post.id}>
                                          <PostCard post={post} platform={post.platform} />
                                          {pillars.length > 0 && (
                                            <div className="mt-1.5 flex items-center justify-end gap-1 flex-wrap">
                                              {assignedPillars.map(p => (
                                                <span
                                                  key={p.id}
                                                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                                  style={{ backgroundColor: `${p.color}20`, color: p.color || '#6366f1' }}
                                                  title={p.name}
                                                >
                                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color || '#6366f1' }} />
                                                  {p.name}
                                                </span>
                                              ))}
                                              <div className="relative flex-shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={(e) => { e.stopPropagation(); setTagOpenPostId(isTagOpen ? null : post.id) }}
                                                  className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${theme.navItemInactive}`}
                                                >
                                                  + Pillar
                                                </button>
                                                {isTagOpen && (
                                                  <div
                                                    className={`absolute right-0 bottom-full mb-1 z-20 rounded-xl border shadow-lg p-2 min-w-[160px] ${theme.card}`}
                                                    onClick={e => e.stopPropagation()}
                                                  >
                                                    <p className={`text-[10px] font-semibold uppercase tracking-wider px-2 pb-1.5 ${theme.subtext}`}>Tag Pillar</p>
                                                    {pillars.map(p => {
                                                      const assigned = post.pillars?.some(pa => pa.contentPillarId === p.id)
                                                      return (
                                                        <button
                                                          key={p.id}
                                                          type="button"
                                                          onClick={() => handleTagPost(p.id, post.id, assigned)}
                                                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${
                                                            assigned
                                                              ? 'bg-indigo-50 text-indigo-700'
                                                              : theme.navItemInactive
                                                          }`}
                                                        >
                                                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color || '#6366f1' }} />
                                                          <span className="flex-1">{p.name}</span>
                                                          {assigned && <span className="ml-auto text-indigo-500 font-bold">✓</span>}
                                                        </button>
                                                      )
                                                    })}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
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
              )}
              {allPosts.length === 0 && (
                  <div className={`text-center text-sm py-10 ${theme.muted}`}>
                    No posts synced yet. Run the worker to pull data from connected accounts.
                  </div>
              )}
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
