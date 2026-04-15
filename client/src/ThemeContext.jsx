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
    detailsLink: 'text-indigo-500',
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
        pill: 'bg-amber-50 text-amber-700 border-amber-200',
        card: 'border-amber-300/90',
        dot: 'bg-amber-500',
        bar: 'bg-amber-500',
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
    appBg: 'bg-gray-800',

    // Sidebar
    sidebar: 'bg-gray-900',
    sidebarBorder: 'border-gray-700',
    brandText: 'text-white',
    brandSub: 'text-gray-500',
    navItemActive: 'bg-indigo-600 text-white',
    navItemInactive: 'text-gray-400 hover:bg-gray-700 hover:text-white',
    searchInput: 'bg-gray-700 text-gray-200 placeholder-gray-500 focus:ring-indigo-400',
    viewBtnActive: 'bg-indigo-600 text-white',
    viewBtnInactive: 'bg-gray-700 text-gray-400 hover:text-white',
    groupBtn: 'text-gray-500 hover:text-gray-300 hover:bg-gray-700',
    groupArrow: 'text-gray-600',
    noClients: 'text-gray-600',
    adminLinkActive: 'bg-indigo-600 text-white',
    adminLinkInactive: 'text-gray-500 hover:bg-gray-700 hover:text-white',

    // Cards + surfaces
    card: 'bg-gray-700 border-gray-600',
    cardDivider: 'border-gray-600',
    surfaceMuted: 'bg-gray-800/70',
    dividerSoft: 'border-white/10',
    progressTrack: 'bg-gray-800',

    // Typography
    heading: 'text-gray-100',
    subtext: 'text-gray-400',
    body: 'text-gray-300',
    muted: 'text-gray-500',
    dimmed: 'text-gray-600',

    // Tabs
    tabsBar: 'border-gray-600',
    tabActive: 'border-indigo-400 text-indigo-400',
    tabInactive: 'border-transparent text-gray-500 hover:text-gray-300',

    // Buttons
    btnPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-900 disabled:cursor-not-allowed',
    btnOutline: 'border-gray-600 bg-gray-700 text-indigo-400 hover:bg-gray-600',
    btnCancel: 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600',
    btnGearActive: 'border-indigo-500 bg-indigo-900 text-indigo-400',
    btnGearInactive: 'border-gray-600 bg-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-600',

    // Inputs
    input: 'border-gray-600 bg-gray-800 text-gray-100 focus:border-indigo-400',

    // Icon badge backgrounds
    accentIconBg: 'bg-indigo-900',
    accentIconText: 'text-indigo-400',
    blueIconBg: 'bg-blue-900',
    blueIconText: 'text-blue-400',

    // Toggle
    toggleOn: 'bg-indigo-600',
    toggleOff: 'bg-gray-600',

    // Settings panel
    settingsPanel: 'border-gray-600 bg-gray-700 shadow-lg shadow-black/40',
    settingsLabel: 'text-gray-300',
    settingsHeading: 'text-gray-500',

    // Semantic status tokens
    status: {
      fresh: {
        pill: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/35',
        card: 'border-emerald-500/45',
        dot: 'bg-emerald-300',
        bar: 'bg-emerald-400',
      },
      aging: {
        pill: 'bg-amber-500/15 text-amber-200 border-amber-400/35',
        card: 'border-amber-500/45',
        dot: 'bg-amber-300',
        bar: 'bg-amber-400',
      },
      stale: {
        pill: 'bg-red-500/15 text-red-200 border-red-400/35',
        card: 'border-red-500/45',
        dot: 'bg-red-300',
        bar: 'bg-red-400',
      },
      unknown: {
        pill: 'bg-gray-800 text-gray-200 border-gray-600',
        card: 'border-gray-600',
        dot: 'bg-gray-300',
        bar: 'bg-gray-400',
      },
    },

    // Misc
    code: 'bg-gray-900',
    codeText: 'text-gray-300',
    detailsLink: 'text-indigo-400',
    emptyStateBg: 'bg-gray-700 border-gray-600 text-gray-400',
    buzzword: 'bg-indigo-900 text-indigo-300',
    overview0ClientsBg: 'bg-indigo-900 border-indigo-800',
    overview0ClientsText: 'text-indigo-200',
    overview0ClientsSub: 'text-indigo-400',
    tokenStatusActive: 'bg-green-900 text-green-400',
    tokenStatusInactive: 'bg-yellow-900 text-yellow-400',
    ga4Badge: 'bg-orange-900 text-orange-400',
    gaEditBtn: 'border-gray-600 bg-gray-700 text-indigo-400 hover:bg-gray-600',
    gaPropertyBtn: 'border-gray-600 bg-gray-700 hover:border-indigo-500 hover:bg-gray-600',
    gaPropertySelected: '',
    resultSuccess: 'border-green-800 bg-green-900',
    resultError: 'border-red-900 bg-red-950',
    mediaBadge: 'bg-violet-900 text-violet-300',
    transcriptToggle: 'text-indigo-400 hover:text-indigo-300',
    transcriptPanel: 'bg-gray-800 text-gray-300 border border-gray-700',

    // Charts
    chart: {
      grid: '#374151',
      bar1: '#818cf8',
      bar2: '#6ee7b7',
      bar3: '#fde68a',
      line1: '#818cf8',
      line2: '#34d399',
      line3: '#fbbf24',
      sources: '#818cf8',
      tickFill: '#9ca3af',
      tooltipBg: '#1f2937',
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
