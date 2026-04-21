import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getClient,
  getBuzzwords,
  getWebAnalytics,
  getMessages,
  getClientOverview,
  getContentPillars,
  assignPostToPillar,
  unassignPostFromPillar,
} from '../api'

const DEFAULT_TAB_VISIBILITY = {
  Messages: true,
  'Website Analytics': true,
  'AI Insights': true,
  'Style Guide': true,
}

const BUZZ_SKIP = new Set([
  'getting','making','going','being','having','doing','saying','taking','looking',
  'coming','giving','using','trying','seeing','wanting','telling','working',
  'calling','asking','putting','turning','keeping','letting','seeming','showing',
  'feeling','leaving','standing','moving','passing','bringing','allowing',
  'starting','ending','thinking','following','running','setting','reading',
  'spending','living','leading','playing','checking','opening','closing',
  'creating','building','helping','sharing','finding','joining','posting',
  'loving','caring','growing','learning','winning','watching','waiting',
  'like','just','this','that','with','from','your','have','will','more',
  'about','what','when','they','them','their','been','also','into','some',
  'there','which','would','could','should','these','those','after','over',
  'only','then','other','time','very','such','much','each','even','back',
])

function persistTab(slug, value) {
  try { localStorage.setItem(`ncm_tab_${slug}`, value) } catch {}
}

function readSavedTab(slug) {
  try { return localStorage.getItem(`ncm_tab_${slug}`) } catch { return null }
}

function persistTabVisibility(slug, value) {
  try { localStorage.setItem(`ncm_tab_vis_${slug}`, JSON.stringify(value)) } catch {}
}

function readSavedTabVisibility(slug) {
  try { return JSON.parse(localStorage.getItem(`ncm_tab_vis_${slug}`) || 'null') } catch { return null }
}

function buildDerivedState({ client, overview, buzzwords, pillarFilter, pillars, showSocial, tabVisibility }) {
  if (!client) {
    return {
      allPosts: [],
      filteredPosts: [],
      totalLikes: 0,
      totalComments: 0,
      totalReach: 0,
      totalShares: 0,
      totalSaves: 0,
      totalFollowers: 0,
      totalEngagement: 0,
      engagementRate: 0,
      platforms: {},
      hasMessagingAccounts: false,
      visibleTabs: tabVisibility['Website Analytics'] ? ['Website Analytics'] : [],
      filteredBuzz: [],
      chartData: [],
      chartPostTypeBreakdown: [],
      chartTabs: [],
      activePillarForChart: null,
      hasTrendData: false,
      hasCharts: false,
    }
  }

  const allPosts = client.socialAccounts
    .flatMap((account) => account.posts.map((post) => ({
      ...post,
      platform: account.platform,
      accountHandle: account.handle,
    })))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))

  const overviewSummary = overview?.summary
  const platformTotals = overview?.chartData?.platformTotals || []
  const filteredPosts = pillarFilter
    ? allPosts.filter((post) => post.pillars?.some((assignment) => assignment.contentPillarId === pillarFilter))
    : allPosts

  const totalLikes = pillarFilter
    ? filteredPosts.reduce((sum, post) => sum + (post.metrics?.[0]?.likes || 0), 0)
    : (overviewSummary ? platformTotals.reduce((sum, platform) => sum + platform.likes, 0) : allPosts.reduce((sum, post) => sum + (post.metrics?.[0]?.likes || 0), 0))
  const totalComments = pillarFilter
    ? filteredPosts.reduce((sum, post) => sum + (post.metrics?.[0]?.commentsCount || 0), 0)
    : (overviewSummary ? platformTotals.reduce((sum, platform) => sum + platform.comments, 0) : allPosts.reduce((sum, post) => sum + (post.metrics?.[0]?.commentsCount || 0), 0))
  const totalReach = pillarFilter
    ? filteredPosts.reduce((sum, post) => sum + (post.metrics?.[0]?.reach || 0), 0)
    : (overviewSummary ? overviewSummary.totalReach : allPosts.reduce((sum, post) => sum + (post.metrics?.[0]?.reach || 0), 0))
  const totalShares = pillarFilter
    ? filteredPosts.reduce((sum, post) => sum + (post.metrics?.[0]?.shares || 0), 0)
    : (overviewSummary ? platformTotals.reduce((sum, platform) => sum + platform.shares, 0) : allPosts.reduce((sum, post) => sum + (post.metrics?.[0]?.shares || 0), 0))
  const totalSaves = pillarFilter
    ? filteredPosts.reduce((sum, post) => sum + (post.metrics?.[0]?.saves || 0), 0)
    : (overviewSummary ? platformTotals.reduce((sum, platform) => sum + platform.saves, 0) : allPosts.reduce((sum, post) => sum + (post.metrics?.[0]?.saves || 0), 0))
  const totalFollowers = overviewSummary
    ? platformTotals.reduce((sum, platform) => sum + platform.followers, 0)
    : client.socialAccounts.reduce((sum, account) => sum + (account.followerCount || 0), 0)
  const totalEngagement = pillarFilter
    ? totalLikes + totalComments + totalShares + totalSaves
    : (overviewSummary ? overviewSummary.totalEngagement : totalLikes + totalComments + totalShares + totalSaves)
  const postsForRate = pillarFilter ? filteredPosts.length : allPosts.length
  const engagementRate = totalFollowers > 0
    ? ((totalEngagement / (postsForRate || 1)) / totalFollowers * 100)
    : 0

  const platforms = {}
  for (const account of client.socialAccounts) {
    const key = account.platform
    if (!platforms[key]) platforms[key] = { accounts: [], posts: [] }
    platforms[key].accounts.push(account)
    for (const post of account.posts) {
      platforms[key].posts.push({ ...post, platform: key, accountHandle: account.handle })
    }
  }
  for (const platform of Object.values(platforms)) {
    platform.posts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  }

  const baseChartData = overview?.chartData?.platformTotals
    ? overview.chartData.platformTotals.map((platform) => ({
        name: platform.handle,
        likes: platform.likes,
        shares: platform.shares,
        saves: platform.saves,
      }))
    : client.socialAccounts.map((account) => ({
        name: account.handle,
        likes: account.posts.reduce((sum, post) => sum + (post.metrics?.[0]?.likes || 0), 0),
        shares: account.posts.reduce((sum, post) => sum + (post.metrics?.[0]?.shares || 0), 0),
        saves: account.posts.reduce((sum, post) => sum + (post.metrics?.[0]?.saves || 0), 0),
      }))

  const chartData = pillarFilter
    ? client.socialAccounts.map((account) => {
        const accountFilteredPosts = account.posts.filter((post) =>
          post.pillars?.some((assignment) => assignment.contentPillarId === pillarFilter)
        )

        return {
          name: account.handle,
          likes: accountFilteredPosts.reduce((sum, post) => sum + (post.metrics?.[0]?.likes || 0), 0),
          shares: accountFilteredPosts.reduce((sum, post) => sum + (post.metrics?.[0]?.shares || 0), 0),
          saves: accountFilteredPosts.reduce((sum, post) => sum + (post.metrics?.[0]?.saves || 0), 0),
        }
      })
    : baseChartData

  const chartPostTypeBreakdown = pillarFilter
    ? (() => {
        const map = {}
        for (const post of filteredPosts) {
          const key = `${post.platform}:${post.mediaType || 'POST'}`
          if (!map[key]) {
            map[key] = {
              type: post.mediaType || 'POST',
              platform: post.platform,
              total: 0,
              count: 0,
            }
          }
          map[key].total += (post.metrics?.[0]?.likes || 0) + (post.metrics?.[0]?.commentsCount || 0)
          map[key].count += 1
        }
        return Object.values(map).map((row) => ({
          ...row,
          avgEngagement: row.count > 0 ? Math.round(row.total / row.count) : 0,
        }))
      })()
    : (overview?.chartData?.postTypeBreakdown || [])

  const hasTrendData = !pillarFilter && (overview?.chartData?.dailyEngagement?.length > 0)
  const hasCharts = chartData.length > 0 || chartPostTypeBreakdown.length > 0 || hasTrendData

  const hasMessagingAccounts = client.socialAccounts.some(
    (account) => account.platform === 'INSTAGRAM' || account.platform === 'FACEBOOK'
  )
  const visibleTabs = [
    ...(showSocial ? ['Social'] : []),
    ...(hasMessagingAccounts && tabVisibility.Messages ? ['Messages'] : []),
    ...(tabVisibility['Website Analytics'] ? ['Website Analytics'] : []),
    ...(tabVisibility['AI Insights'] ? ['AI Insights'] : []),
    ...(tabVisibility['Style Guide'] ? ['Style Guide'] : []),
  ]

  const filteredBuzz = buzzwords.filter(
    (buzzword) => buzzword.word.length >= 3 && !BUZZ_SKIP.has(buzzword.word.toLowerCase())
  )

  const chartTabs = [
    { key: 'account', label: 'By Account', available: chartData.length > 0 },
    { key: 'type', label: 'Post Type', available: chartPostTypeBreakdown.length > 0 },
    { key: 'trend', label: 'Trend', available: hasTrendData },
  ].filter((tab) => tab.available)

  const activePillarForChart = pillars.find((pillar) => pillar.id === pillarFilter) ?? null

  return {
    allPosts,
    filteredPosts,
    totalLikes,
    totalComments,
    totalReach,
    totalShares,
    totalSaves,
    totalFollowers,
    totalEngagement,
    engagementRate,
    platforms,
    hasMessagingAccounts,
    visibleTabs,
    filteredBuzz,
    chartData,
    chartPostTypeBreakdown,
    chartTabs,
    activePillarForChart,
    hasTrendData,
    hasCharts,
  }
}

export function useClientDetail(slug) {
  const [client, setClient] = useState(null)
  const [overview, setOverview] = useState(null)
  const [buzzwords, setBuzzwords] = useState([])
  const [webData, setWebData] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [tab, setTab] = useState('Social')
  const [showSocial, setShowSocial] = useState(false)
  const [tabVisibility, setTabVisibility] = useState(DEFAULT_TAB_VISIBILITY)
  const [collapsedPlatforms, setCollapsedPlatforms] = useState({})
  const [pillarFilter, setPillarFilter] = useState(null)
  const [pillars, setPillars] = useState([])
  const [tagOpenPostId, setTagOpenPostId] = useState(null)
  const [chartTab, setChartTab] = useState('account')
  const [buzzOpen, setBuzzOpen] = useState(false)
  const [platformsOpen, setPlatformsOpen] = useState(true)

  const derived = useMemo(() => buildDerivedState({
    client,
    overview,
    buzzwords,
    pillarFilter,
    pillars,
    showSocial,
    tabVisibility,
  }), [buzzwords, client, overview, pillarFilter, pillars, showSocial, tabVisibility])

  const refreshClient = useCallback(async () => {
    const nextClient = await getClient(slug)
    setClient(nextClient)
    setShowSocial(nextClient.socialAccounts.length > 0)
    return nextClient
  }, [slug])

  const setActiveTab = useCallback((value) => {
    setTab(value)
    persistTab(slug, value)
  }, [slug])

  useEffect(() => {
    setClient(null)
    setOverview(null)
    setWebData(null)
    setBuzzwords([])
    setMessages([])
    setShowSocial(false)
    setCollapsedPlatforms({})
    setPillarFilter(null)
    setPillars([])
    setTagOpenPostId(null)
    setChartTab('account')
    setBuzzOpen(false)
    setPlatformsOpen(true)

    const savedVisibility = readSavedTabVisibility(slug)
    if (savedVisibility) {
      setTabVisibility((current) => ({ ...current, ...savedVisibility }))
    } else {
      setTabVisibility(DEFAULT_TAB_VISIBILITY)
    }

    let cancelled = false

    const clientPromise = getClient(slug)
    getClientOverview(slug).then((data) => { if (!cancelled) setOverview(data) }).catch(() => {})
    getBuzzwords(slug).then((data) => { if (!cancelled) setBuzzwords(data) }).catch(() => {})
    getWebAnalytics(slug).then((data) => { if (!cancelled) setWebData(data) }).catch(() => {})

    clientPromise
      .then((clientData) => {
        if (cancelled) return

        setClient(clientData)

        const hasSocial = clientData.socialAccounts.length > 0
        const hasMessages = clientData.socialAccounts.some(
          (account) => account.platform === 'INSTAGRAM' || account.platform === 'FACEBOOK'
        )
        const visibility = savedVisibility || DEFAULT_TAB_VISIBILITY
        const isTabVisible = (tabName) => {
          if (tabName === 'Social') return hasSocial
          if (tabName === 'Messages') return hasMessages && visibility.Messages
          return visibility[tabName]
        }

        setShowSocial(hasSocial)

        const storedTab = readSavedTab(slug)
        const validTabs = ['Social', 'Messages', 'Website Analytics', 'AI Insights', 'Style Guide']
        const resolvedTab = storedTab && validTabs.includes(storedTab) && isTabVisible(storedTab)
          ? storedTab
          : validTabs.find(isTabVisible) || 'Website Analytics'
        setTab(resolvedTab)

        if (hasSocial && hasMessages) {
          setMessagesLoading(true)
          getMessages(slug, { includeHidden: true })
            .then((data) => {
              if (!cancelled) {
                setMessages(data)
              }
            })
            .catch(() => {})
            .finally(() => {
              if (!cancelled) {
                setMessagesLoading(false)
              }
            })
        }

        getContentPillars(clientData.id)
          .then((data) => {
            if (!cancelled) {
              setPillars(data)
            }
          })
          .catch(() => {})
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    if (derived.chartTabs.length === 0) return
    if (!derived.chartTabs.some((candidate) => candidate.key === chartTab)) {
      setChartTab(derived.chartTabs[0].key)
    }
  }, [chartTab, derived.chartTabs])

  const applyPostPillarChange = useCallback((pillarId, postId, isAssigned) => {
    setClient((current) => current && ({
      ...current,
      socialAccounts: current.socialAccounts.map((account) => ({
        ...account,
        posts: account.posts.map((post) => post.id !== postId ? post : {
          ...post,
          pillars: isAssigned
            ? (post.pillars || []).filter((assignment) => assignment.contentPillarId !== pillarId)
            : [...(post.pillars || []), { contentPillarId: pillarId }],
        }),
      })),
    }))
  }, [])

  const handleTagPost = useCallback(async (pillarId, postId, isAssigned) => {
    try {
      if (isAssigned) await unassignPostFromPillar(pillarId, postId)
      else await assignPostToPillar(pillarId, postId)
      applyPostPillarChange(pillarId, postId, isAssigned)
    } catch {}
    setTagOpenPostId(null)
  }, [applyPostPillarChange])

  const handleToggleSocial = useCallback((enabled) => {
    setShowSocial(enabled)

    if (!enabled && (tab === 'Social' || tab === 'Messages')) {
      setActiveTab('Website Analytics')
    }

    if (enabled && tab === 'Website Analytics') {
      setActiveTab('Social')
    }
  }, [setActiveTab, tab])

  const handleToggleTab = useCallback((tabName, enabled) => {
    if (tabName === 'Social') {
      handleToggleSocial(enabled)
      return
    }

    const nextVisibility = { ...tabVisibility, [tabName]: enabled }
    setTabVisibility(nextVisibility)
    persistTabVisibility(slug, nextVisibility)

    if (!enabled && tab === tabName) {
      const fallback = ['Social', 'Messages', 'Website Analytics', 'AI Insights', 'Style Guide'].find((candidate) => {
        if (candidate === tabName) return false
        if (candidate === 'Social') return showSocial
        if (candidate === 'Messages') return derived.hasMessagingAccounts && nextVisibility.Messages
        return nextVisibility[candidate]
      })

      if (fallback) {
        setActiveTab(fallback)
      }
    }
  }, [derived.hasMessagingAccounts, handleToggleSocial, setActiveTab, showSocial, slug, tab, tabVisibility])

  return {
    client,
    setClient,
    refreshClient,
    overview,
    buzzwords,
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
    handleToggleSocial,
    handleToggleTab,
    ...derived,
  }
}
