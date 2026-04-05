import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getOverview   = ()     => api.get('/analytics/overview').then(r => r.data)
export const getClients    = ()     => api.get('/clients').then(r => r.data)
export const getClient     = (slug) => api.get(`/clients/${slug}`).then(r => r.data)
export const updateClient  = (slug, data) => api.patch(`/clients/${slug}`, data).then(r => r.data)
export const getBuzzwords  = (slug) => api.get(`/analytics/client/${slug}/buzzwords`).then(r => r.data)
export const getWebAnalytics = (slug) => api.get(`/analytics/client/${slug}/web`).then(r => r.data)
export const getGa4Properties = () => api.get('/ga4-properties').then(r => r.data)
export const addSocialAccount = (slug, platform, handle) => api.post(`/clients/${slug}/add-social`, { platform, handle }).then(r => r.data)
export const refreshMetaTokens = (token) => api.post('/admin/refresh-meta-tokens', { token }).then(r => r.data)
export const triggerAutoRefresh = () => api.get('/admin/refresh-meta-tokens').then(r => r.data)
export const exchangeShortToken = (shortToken) => api.post('/admin/exchange-short-token', { shortToken }).then(r => r.data)
export const getMessages = (slug, { limit, includeHidden } = {}) =>
  api.get(`/messages/client/${slug}`, { params: { ...(limit ? { limit } : {}), ...(includeHidden ? { includeHidden: 'true' } : {}) } }).then(r => r.data)
export const hideConversation = (id, hidden) => api.patch(`/messages/conversations/${id}/hide`, { hidden }).then(r => r.data)
export const lookupSocialHandle = (platform, handle) => api.get('/social/lookup', { params: { platform, handle } }).then(r => r.data)
