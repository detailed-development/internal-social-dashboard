import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getOverview   = ()     => api.get('/analytics/overview').then(r => r.data)
export const getClients    = ()     => api.get('/clients').then(r => r.data)
export const getClient     = (slug) => api.get(`/clients/${slug}`).then(r => r.data)
export const updateClient  = (slug, data) => api.patch(`/clients/${slug}`, data).then(r => r.data)
export const getBuzzwords  = (slug) => api.get(`/analytics/client/${slug}/buzzwords`).then(r => r.data)
export const getWebAnalytics = (slug) => api.get(`/analytics/client/${slug}/web`).then(r => r.data)
// Canonical non-AI analytics endpoint (Layer B). Returns chartData + summary
// + freshness + ruleInsights for a client + date range.
export const getClientOverview = (slug, { start, end } = {}) =>
  api.get(`/analytics/clients/${slug}/overview`, { params: { start, end } }).then(r => r.data)
export const getGa4Properties = () => api.get('/ga4-properties').then(r => r.data)
export const addSocialAccount = (slug, platform, handle) => api.post(`/clients/${slug}/add-social`, { platform, handle }).then(r => r.data)
export const removeSocialAccount = (slug, accountId) => api.delete(`/clients/${slug}/social/${accountId}`)
export const refreshMetaTokens = (token) => api.post('/admin/refresh-meta-tokens', { token }).then(r => r.data)
export const triggerAutoRefresh = () => api.get('/admin/refresh-meta-tokens').then(r => r.data)
export const exchangeShortToken = (shortToken) => api.post('/admin/exchange-short-token', { shortToken }).then(r => r.data)
export const getMessages = (slug, { limit, includeHidden } = {}) =>
  api.get(`/messages/client/${slug}`, { params: { ...(limit ? { limit } : {}), ...(includeHidden ? { includeHidden: 'true' } : {}) } }).then(r => r.data)
export const hideConversation = (id, hidden) => api.patch(`/messages/conversations/${id}/hide`, { hidden }).then(r => r.data)
export const lookupSocialHandle = (platform, handle) => api.get('/social/lookup', { params: { platform, handle } }).then(r => r.data)

// Content Pillars
export const getContentPillars = (clientId) => api.get('/content-pillars', { params: { clientId } }).then(r => r.data)
export const createContentPillar = (data) => api.post('/content-pillars', data).then(r => r.data)
export const updateContentPillar = (id, data) => api.patch(`/content-pillars/${id}`, data).then(r => r.data)
export const deleteContentPillar = (id) => api.delete(`/content-pillars/${id}`)
export const assignPostToPillar = (pillarId, postId) => api.post(`/content-pillars/${pillarId}/posts/${postId}`)
export const unassignPostFromPillar = (pillarId, postId) => api.delete(`/content-pillars/${pillarId}/posts/${postId}`)
export const getPillarAnalytics = (pillarId) => api.get(`/content-pillars/${pillarId}/analytics`).then(r => r.data)

// Style Guide
export const getStyleGuide = (slug) => api.get(`/clients/${slug}/style-guide`).then(r => r.data)
export const updateStyleGuide = (slug, data) => api.put(`/clients/${slug}/style-guide`, data).then(r => r.data)

// Report Styles
export const getReportStyles = (clientId) => api.get('/report-styles', { params: { clientId } }).then(r => r.data)
export const createReportStyle = (data) => api.post('/report-styles', data).then(r => r.data)
export const updateReportStyle = (id, data) => api.patch(`/report-styles/${id}`, data).then(r => r.data)
export const deleteReportStyle = (id) => api.delete(`/report-styles/${id}`)

function buildPluginPayload(data) {
  if (!data?.file) return data

  const form = new FormData()
  form.append('title', data.title || '')
  form.append('category', data.category || 'General')
  form.append('description', data.description || '')
  form.append('version', data.version || '')
  form.append('content', data.content || '')
  form.append('fileName', data.fileName || '')
  form.append('fileType', data.fileType || '')
  form.append('file', data.file)

  return form
}

function uploadProgressHandler(onProgress) {
  return e => {
    if (!onProgress || !e.total) return
    onProgress(Math.round((e.loaded / e.total) * 100))
  }
}

// Plugins / Tools
export const getPlugins = () => api.get('/plugins').then(r => r.data)
export const createPlugin = (data) => api.post('/plugins', buildPluginPayload(data)).then(r => r.data)
export const updatePlugin = (id, data) => api.patch(`/plugins/${id}`, buildPluginPayload(data)).then(r => r.data)
export const deletePlugin = (id) => api.delete(`/plugins/${id}`)
export const getBunnyStatus = () => api.get('/plugins/bunny-status').then(r => r.data)
export const uploadPluginToBunny = (data, onProgress) => {
  const form = new FormData()
  form.append('title', data.title || '')
  form.append('category', data.category || 'General')
  form.append('description', data.description || '')
  form.append('version', data.version || '')
  form.append('file', data.file)
  return api.post('/plugins/bunny', form, {
    onUploadProgress: uploadProgressHandler(onProgress),
  }).then(r => r.data)
}
export const uploadPluginVersionToBunny = (id, data, onProgress) => {
  const form = new FormData()
  form.append('version', data.version || '')
  form.append('file', data.file)
  return api.post(`/plugins/${id}/versions/bunny`, form, {
    onUploadProgress: uploadProgressHandler(onProgress),
  }).then(r => r.data)
}
export const deletePluginVersion = (id, versionId) =>
  api.delete(`/plugins/${id}/versions/${versionId}`).then(r => r.data)

// Platform App Passwords
export const getPlatformAppPassword = (slug, platform) => api.get(`/platform-app-passwords/${slug}/${platform}`).then(r => r.data)
export const updatePlatformAppPassword = (slug, platform, data) => api.put(`/platform-app-passwords/${slug}/${platform}`, data).then(r => r.data)
export const deletePlatformAppPasswordHistory = (slug, platform, historyId) =>
  api.delete(`/platform-app-passwords/${slug}/${platform}/history/${historyId}`).then(r => r.data)

// AI features
export const generateWeeklyInsights = (params) => api.post('/ai/weekly-insights', params).then(r => r.data)
export const generateCaption = (params) => api.post('/ai/caption-generator', params).then(r => r.data)
export const extractHashtags = (params) => api.post('/ai/hashtag-extractor', params).then(r => r.data)
export const generateReportDraft = (params) => api.post('/ai/report-draft', params).then(r => r.data)  // params may include selectedModules: string[]
export const rewriteContent = (params) => api.post('/ai/content-rewriter', params).then(r => r.data)
export const generateImagePrompt = (params) => api.post('/ai/image-prompt-generator', params).then(r => r.data)
export const checkAiGeneration = (params) => api.post('/ai/check', params).then(r => r.data)
export const getCachedIntervals = (params) => api.get('/ai/cached-intervals', { params }).then(r => r.data)
export const deleteCachedInterval = (data) => api.delete('/ai/cached-intervals', { data }).then(r => r.data)
