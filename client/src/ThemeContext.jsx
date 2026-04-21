import { createContext, useContext, useState } from 'react'

export const SIDEBAR_COLORS = [
  { id: 'default', label: 'Default', color: null },
  { id: 'slate', label: 'Slate', color: '#0f172a' },
  { id: 'navy', label: 'Navy', color: '#172554' },
  { id: 'indigo', label: 'Indigo', color: '#1e1b4b' },
  { id: 'purple', label: 'Purple', color: '#2e1065' },
  { id: 'teal', label: 'Teal', color: '#042f2e' },
  { id: 'wine', label: 'Wine', color: '#4c0519' },
  { id: 'charcoal', label: 'Charcoal', color: '#18181b' },
]

export const THEMES = {
  default: {
    id: 'default',
    name: 'Default',
    emoji: '🖥️',

    // App
    appBg: 'bg-gray-50',

    // Sidebar
    sidebar: 'bg-gray-900',
    sidebarBorder: 'border-gray-800',
    brandText: 'text-white',
    brandSub: 'text-gray-500',
    navItemActive: 'bg-indigo-600 text-white',
    navItemInactive: 'text-gray-400 hover:bg-gray-800 hover:text-white',
    searchInput: 'bg-gray-800 text-gray-200 placeholder-gray-500 focus:ring-indigo-500',
    viewBtnActive: 'bg-indigo-600 text-white',
    viewBtnInactive: 'bg-gray-800 text-gray-400 hover:text-white',
    groupBtn: 'text-gray-500 hover:text-gray-300 hover:bg-gray-800',
    groupArrow: 'text-gray-600',
    noClients: 'text-gray-600',
    adminLinkActive: 'bg-indigo-600 text-white',
    adminLinkInactive: 'text-gray-500 hover:bg-gray-800 hover:text-white',

    // Cards + surfaces
    card: 'bg-white border-gray-200',
    cardDivider: 'border-gray-100',
    surfaceMuted: 'bg-gray-50',
    dividerSoft: 'border-gray-200/80',
    progressTrack: 'bg-gray-100',

    // Typography
    heading: 'text-gray-900',
    subtext: 'text-gray-500',
    body: 'text-gray-700',
    muted: 'text-gray-400',
    dimmed: 'text-gray-300',

    // Tabs
    tabsBar: 'border-gray-200',
    tabActive: 'border-indigo-600 text-indigo-600',
    tabInactive: 'border-transparent text-gray-500 hover:text-gray-700',

    // Buttons
    btnPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-300 disabled:cursor-not-allowed',
    btnOutline: 'border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50',
    btnCancel: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
    btnGearActive: 'border-indigo-300 bg-indigo-50 text-indigo-600',
    btnGearInactive: 'border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50',

    // Inputs
    input: 'border-gray-300 bg-white text-gray-900 focus:border-indigo-500',
    focusRing: 'focus:ring-indigo-400',

    // Icon badge backgrounds
    accentIconBg: 'bg-indigo-100',
    accentIconText: 'text-indigo-600',
    blueIconBg: 'bg-blue-100',
    blueIconText: 'text-blue-600',

    // Toggle
    toggleOn: 'bg-indigo-600',
    toggleOff: 'bg-gray-300',

    // Settings panel
    settingsPanel: 'border-gray-200 bg-white shadow-lg',
    settingsLabel: 'text-gray-700',
    settingsHeading: 'text-gray-500',

    // Semantic status tokens
    status: {
      fresh: {
        pill: 'bg-emerald-600 text-white border-emerald-600',
        card: 'border-emerald-300',
        dot: 'bg-white/90',
        bar: 'bg-emerald-500',
      },
      aging: {
        pill: 'ncm-orange text-white border-ncm-orange',
        card: 'border-amber-300',
        dot: 'bg-white/90',
        bar: 'ncm-orange',
      },
      stale: {
        pill: 'bg-red-600 text-white border-red-600',
        card: 'border-red-300',
        dot: 'bg-white/90',
        bar: 'bg-red-500',
      },
      unknown: {
        pill: 'bg-gray-200 text-gray-800 border-gray-300',
        card: 'border-gray-300',
        dot: 'bg-gray-500',
        bar: 'bg-gray-400',
      },
    },

    // Misc
    code: 'bg-gray-100',
    codeText: '',
    detailsLink: 'text-indigo-500 hover:text-indigo-600',
    emptyStateBg: 'bg-gray-50 border-gray-200 text-gray-400',
    buzzword: 'bg-indigo-50 text-indigo-700',
    overview0ClientsBg: 'bg-indigo-50 border-indigo-100',
    overview0ClientsText: 'text-indigo-800',
    overview0ClientsSub: 'text-indigo-500',
    tokenStatusActive: 'bg-green-100 text-green-700',
    tokenStatusInactive: 'bg-yellow-100 text-yellow-700',
    ga4Badge: 'bg-orange-100 text-orange-700',
    gaEditBtn: 'border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50',
    gaPropertyBtn: 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50',
    gaPropertySelected: '',
    resultSuccess: 'border-green-100 bg-green-50',
    resultError: 'border-red-100 bg-red-50',
    mediaBadge: 'bg-violet-100 text-violet-700',
    transcriptToggle: 'text-violet-600 hover:text-violet-800',
    transcriptPanel: 'bg-gray-50 text-gray-600 border border-gray-200',

    // Charts
    chart: {
      grid: '#f0f0f0',
      bar1: '#6366f1',
      bar2: '#a5b4fc',
      bar3: '#c7d2fe',
      line1: '#6366f1',
      line2: '#10b981',
      line3: '#f59e0b',
      sources: '#6366f1',
      tickFill: '#6b7280',
      tooltipBg: '#fff',
    },
  },

  'neon-cactus': {
    id: 'neon-cactus',
    name: 'Neon Cactus',
    emoji: '🌵',

    // App
    appBg: 'bg-pink-50',

    // Sidebar
    sidebar: 'bg-gray-900',
    sidebarBorder: 'border-gray-800',
    brandText: 'text-lime-400 neon-brand',
    brandSub: 'text-gray-500',
    navItemActive: 'bg-lime-400 text-gray-900 font-semibold neon-active',
    navItemInactive: 'text-gray-400 hover:bg-gray-800 hover:text-lime-300',
    searchInput: 'bg-gray-800 text-lime-300 placeholder-gray-600 focus:ring-lime-400',
    viewBtnActive: 'bg-lime-400 text-gray-900 font-semibold',
    viewBtnInactive: 'bg-gray-800 text-gray-400 hover:text-lime-300',
    groupBtn: 'text-gray-500 hover:text-lime-300 hover:bg-gray-800',
    groupArrow: 'text-gray-600',
    noClients: 'text-gray-600',
    adminLinkActive: 'bg-lime-400 text-gray-900 font-semibold neon-active',
    adminLinkInactive: 'text-gray-500 hover:bg-gray-800 hover:text-lime-300',

    // Cards + surfaces
    card: 'bg-white border-fuchsia-200 neon-card',
    cardDivider: 'border-fuchsia-100',
    surfaceMuted: 'bg-fuchsia-50/60',
    dividerSoft: 'border-fuchsia-200/80',
    progressTrack: 'bg-fuchsia-100',

    // Typography
    heading: 'text-gray-900',
    subtext: 'text-gray-500',
    body: 'text-gray-700',
    muted: 'text-gray-400',
    dimmed: 'text-gray-300',

    // Tabs
    tabsBar: 'border-fuchsia-200',
    tabActive: 'border-fuchsia-500 text-fuchsia-600',
    tabInactive: 'border-transparent text-gray-500 hover:text-fuchsia-500',

    // Buttons
    btnPrimary: 'bg-fuchsia-500 hover:bg-fuchsia-600 text-white disabled:bg-fuchsia-300 disabled:cursor-not-allowed',
    btnOutline: 'border-fuchsia-300 bg-white text-fuchsia-600 hover:bg-fuchsia-50',
    btnCancel: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
    btnGearActive: 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-600',
    btnGearInactive: 'border-fuchsia-200 bg-white text-fuchsia-400 hover:text-fuchsia-600 hover:bg-fuchsia-50',

    // Inputs
    input: 'border-fuchsia-200 bg-white text-gray-900 focus:border-fuchsia-500',
    focusRing: 'focus:ring-fuchsia-400',

    // Icon badge backgrounds
    accentIconBg: 'bg-lime-100',
    accentIconText: 'text-lime-700',
    blueIconBg: 'bg-fuchsia-100',
    blueIconText: 'text-fuchsia-600',

    // Toggle
    toggleOn: 'bg-fuchsia-500',
    toggleOff: 'bg-gray-300',

    // Settings panel
    settingsPanel: 'border-fuchsia-200 bg-white shadow-lg shadow-fuchsia-100',
    settingsLabel: 'text-gray-700',
    settingsHeading: 'text-fuchsia-400',

    // Semantic status tokens
    status: {
      fresh: {
        pill: 'bg-lime-100 text-lime-800 border-lime-200',
        card: 'border-lime-300/90',
        dot: 'bg-lime-500',
        bar: 'bg-lime-500',
      },
      aging: {
        pill: 'ncm-bg-pink ncm-pink-text ncm-pink-border',
        card: 'border-amber-300/90',
        dot: 'ncm-pink-text',
        bar: 'ncm-pink-border',
      },
      stale: {
        pill: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
        card: 'border-fuchsia-300/90',
        dot: 'bg-fuchsia-500',
        bar: 'bg-fuchsia-500',
      },
      unknown: {
        pill: 'bg-gray-100 text-gray-600 border-gray-200',
        card: 'border-fuchsia-200/80',
        dot: 'bg-gray-400',
        bar: 'bg-gray-400',
      },
    },

    // Misc
    code: 'bg-fuchsia-50',
    codeText: 'text-fuchsia-700',
    detailsLink: 'text-fuchsia-500 hover:text-fuchsia-700',
    emptyStateBg: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-400',
    buzzword: 'bg-lime-100 text-lime-800 neon-buzzword',
    overview0ClientsBg: 'bg-lime-50 border-lime-200',
    overview0ClientsText: 'text-lime-900',
    overview0ClientsSub: 'text-lime-600',
    tokenStatusActive: 'bg-lime-100 text-lime-700',
    tokenStatusInactive: 'bg-yellow-100 text-yellow-700',
    ga4Badge: 'bg-fuchsia-100 text-fuchsia-700',
    gaEditBtn: 'border-fuchsia-200 bg-white text-fuchsia-600 hover:bg-fuchsia-50',
    gaPropertyBtn: 'border-fuchsia-100 bg-fuchsia-50 hover:border-fuchsia-400 hover:bg-fuchsia-100',
    gaPropertySelected: '',
    resultSuccess: 'border-lime-200 bg-lime-50',
    resultError: 'border-red-100 bg-red-50',
    mediaBadge: 'bg-lime-100 text-lime-800',
    transcriptToggle: 'text-fuchsia-600 hover:text-fuchsia-800',
    transcriptPanel: 'bg-fuchsia-50 text-gray-600 border border-fuchsia-100',

    // Charts
    chart: {
      grid: '#fce7f3',
      bar1: '#d946ef',
      bar2: '#84cc16',
      bar3: '#facc15',
      line1: '#d946ef',
      line2: '#84cc16',
      line3: '#facc15',
      sources: '#d946ef',
      tickFill: '#a21caf',
      tooltipBg: '#fff0f9',
    },
  },

  dark: {
    id: 'dark',
    name: 'Dark Mode',
    emoji: '🌙',

    // App
    appBg: 'bg-neutral-950',

    // Sidebar
    sidebar: 'bg-neutral-950',
    sidebarBorder: 'border-neutral-800',
    brandText: 'text-emerald-300',
    brandSub: 'text-neutral-500',
    navItemActive: 'bg-emerald-400 text-black font-semibold',
    navItemInactive: 'text-neutral-400 hover:bg-neutral-900 hover:text-emerald-300',
    searchInput: 'bg-neutral-900 text-neutral-100 placeholder-neutral-500 focus:ring-emerald-400',
    viewBtnActive: 'bg-emerald-400 text-black font-semibold',
    viewBtnInactive: 'bg-neutral-900 text-neutral-400 hover:text-emerald-300',
    groupBtn: 'text-neutral-500 hover:text-emerald-300 hover:bg-neutral-900',
    groupArrow: 'text-neutral-600',
    noClients: 'text-neutral-600',
    adminLinkActive: 'bg-emerald-400 text-black font-semibold',
    adminLinkInactive: 'text-neutral-500 hover:bg-neutral-900 hover:text-emerald-300',

    // Cards + surfaces
    card: 'bg-neutral-900 border-neutral-800',
    cardDivider: 'border-neutral-800',
    surfaceMuted: 'bg-neutral-950/80',
    dividerSoft: 'border-neutral-800/80',
    progressTrack: 'bg-neutral-800',

    // Typography
    heading: 'text-neutral-100',
    subtext: 'text-neutral-400',
    body: 'text-neutral-300',
    muted: 'text-neutral-500',
    dimmed: 'text-neutral-600',

    // Tabs
    tabsBar: 'border-neutral-800',
    tabActive: 'border-emerald-400 text-emerald-300',
    tabInactive: 'border-transparent text-neutral-500 hover:text-emerald-300',

    // Buttons
    btnPrimary: 'bg-emerald-400 hover:bg-emerald-300 text-black disabled:bg-emerald-900 disabled:text-emerald-300 disabled:cursor-not-allowed',
    btnOutline: 'border-neutral-700 bg-neutral-900 text-emerald-300 hover:bg-neutral-800',
    btnCancel: 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800',
    btnGearActive: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    btnGearInactive: 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800',

    // Inputs
    input: 'border-neutral-800 bg-neutral-950 text-neutral-100 focus:border-emerald-400',
    focusRing: 'focus:ring-emerald-400',

    // Icon badge backgrounds
    accentIconBg: 'bg-emerald-500/15',
    accentIconText: 'text-emerald-300',
    blueIconBg: 'bg-neutral-800',
    blueIconText: 'text-emerald-200',

    // Toggle
    toggleOn: 'bg-emerald-400',
    toggleOff: 'bg-neutral-700',

    // Settings panel
    settingsPanel: 'border-neutral-800 bg-neutral-900 shadow-lg shadow-black/50',
    settingsLabel: 'text-neutral-300',
    settingsHeading: 'text-neutral-500',

    // Semantic status tokens
    status: {
      fresh: {
        pill: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/35',
        card: 'border-emerald-500/45',
        dot: 'bg-emerald-400',
        bar: 'bg-emerald-400',
      },
      aging: {
        pill: 'bg-amber-500/10 text-amber-300 border-amber-400/35',
        card: 'border-amber-500/45',
        dot: 'bg-amber-400',
        bar: 'bg-amber-400',
      },
      stale: {
        pill: 'bg-red-500/15 ncm-darkmode-red-text border-red-400/35',
        card: 'border-red-500/45',
        dot: 'bg-red-400',
        bar: 'bg-red-400',
      },
      unknown: {
        pill: 'bg-neutral-950 text-neutral-300 border-neutral-800',
        card: 'border-neutral-800',
        dot: 'bg-neutral-400',
        bar: 'bg-neutral-500',
      },
    },

    // Misc
    code: 'bg-neutral-950',
    codeText: 'text-neutral-300',
    detailsLink: 'text-emerald-300 hover:text-emerald-200',
    emptyStateBg: 'bg-neutral-900 border-neutral-800 text-neutral-400',
    buzzword: 'bg-emerald-500/10 text-emerald-300',
    overview0ClientsBg: 'bg-emerald-500/10 border-emerald-500/20',
    overview0ClientsText: 'text-emerald-200',
    overview0ClientsSub: 'text-emerald-300',
    tokenStatusActive: 'bg-emerald-500/15 text-emerald-300',
    tokenStatusInactive: 'bg-amber-500/15 text-amber-300',
    ga4Badge: 'bg-emerald-500/15 text-emerald-300',
    gaEditBtn: 'border-neutral-700 bg-neutral-900 text-emerald-300 hover:bg-neutral-800',
    gaPropertyBtn: 'border-neutral-700 bg-neutral-900 hover:border-emerald-500/40 hover:bg-neutral-800',
    gaPropertySelected: '',
    resultSuccess: 'border-emerald-900 bg-emerald-950/40',
    resultError: 'border-red-900 bg-red-950/40',
    mediaBadge: 'bg-emerald-500/15 text-emerald-300',
    transcriptToggle: 'text-emerald-300 hover:text-emerald-200',
    transcriptPanel: 'bg-neutral-950 text-neutral-300 border border-neutral-800',

    // Charts
    chart: {
      grid: '#262626',
      bar1: '#34d399',
      bar2: '#86efac',
      bar3: '#fde68a',
      line1: '#34d399',
      line2: '#86efac',
      line3: '#fbbf24',
      sources: '#34d399',
      tickFill: '#a3a3a3',
      tooltipBg: '#171717',
    },
  },
}

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKey] = useState(() => {
    try { return localStorage.getItem('ncm_theme') || 'default' } catch { return 'default' }
  })

  const [sidebarColorId, setSidebarColorIdState] = useState(() => {
    try { return localStorage.getItem('ncm_sidebar_color') || 'default' } catch { return 'default' }
  })

  function setTheme(key) {
    setThemeKey(key)
    try { localStorage.setItem('ncm_theme', key) } catch {}
  }

  function setSidebarColor(id) {
    setSidebarColorIdState(id)
    try { localStorage.setItem('ncm_sidebar_color', id) } catch {}
  }

  const theme = Object.hasOwn(THEMES, themeKey) ? THEMES[themeKey] : THEMES.default
  const sidebarColor = SIDEBAR_COLORS.find(c => c.id === sidebarColorId)?.color || null

  return (
    <ThemeContext.Provider value={{ theme, themeKey, setTheme, themes: THEMES, sidebarColor, sidebarColorId, setSidebarColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
