import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { getClients } from '../../api'
import { useTheme } from '../../ThemeContext'


function ClientLink({ client }) {
  const { theme } = useTheme()
  return (
    <NavLink
      to={`/clients/${client.slug}`}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
          isActive ? theme.navItemActive : theme.navItemInactive
        }`
      }
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: client.avatarColor || '#6366f1' }}
      />
      <span className="truncate">{client.name}</span>
    </NavLink>
  )
}

/* ── Icons ────────────────────────────────────────────── */

const HamburgerIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const OverviewIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
)

const AIToolsIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11h1a3 3 0 0 1 3 3v1h1a2 2 0 0 1 2 2v4h-6v-4a2 2 0 0 1 2-2h1v-1a1 1 0 0 0-1-1h-1v2h-2V9.5A4 4 0 0 1 12 2z"/>
    <path d="M8 9.5V11H7a1 1 0 0 0-1 1v1h1a2 2 0 0 1 2 2v4H3v-4a2 2 0 0 1 2-2h1v-1a3 3 0 0 1 3-3h1V9.5A4.002 4.002 0 0 1 8 6a4 4 0 0 1 4-4"/>
  </svg>
)

const GearIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)

const CollapseIcon = ({ collapsed }) => (
  <svg className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="11 17 6 12 11 7"/>
    <polyline points="18 17 13 12 18 7"/>
  </svg>
)


/* ── Layout ───────────────────────────────────────────── */

export default function Layout() {
  const { theme, sidebarColor } = useTheme()
  const location = useLocation()
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [view, setView] = useState('grouped') // 'grouped' | 'az'
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ncm_sidebar_collapsed') || '{}') } catch { return {} }
  })

  // Mobile drawer
  const [mobileOpen, setMobileOpen] = useState(false)

  // Desktop sidebar minimized
  const [minimized, setMinimized] = useState(() => {
    try { return localStorage.getItem('ncm_sidebar_minimized') === 'true' } catch { return false }
  })

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  useEffect(() => {
    getClients().then(setClients).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter(c => c.name.toLowerCase().includes(q))
  }, [clients, search])

  // Build grouped structure
  const grouped = useMemo(() => {
    const map = {}
    for (const client of filtered) {
      const key   = client.group?.slug  || 'ungrouped'
      const label = client.group?.name  || 'Ungrouped'
      const color = client.group?.avatarColor || '#94a3b8'
      const order = client.group?.sortOrder   ?? 100
      if (!map[key]) map[key] = { label, color, order, clients: [] }
      map[key].clients.push(client)
    }
    return Object.entries(map).sort((a, b) => a[1].order - b[1].order)
  }, [filtered])

  function toggleGroup(key) {
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem('ncm_sidebar_collapsed', JSON.stringify(next)) } catch {}
      return next
    })
  }

  function toggleMinimized() {
    setMinimized(prev => {
      const next = !prev
      try { localStorage.setItem('ncm_sidebar_minimized', String(next)) } catch {}
      return next
    })
  }

  // Custom sidebar color
  const sidebarStyle = sidebarColor ? { backgroundColor: sidebarColor } : {}
  const sidebarBgClass = sidebarColor ? '' : theme.sidebar

  /* ── Sidebar inner content (shared between mobile & desktop) ── */
  function renderSidebar(isMinimized) {
    return (
      <>
        {/* Branding */}
        <div className={`${isMinimized ? 'px-2 py-4' : 'px-5 py-4'} border-b ${theme.sidebarBorder}`}>
          {isMinimized ? (
            <h1 className={`font-bold text-lg text-center ${theme.brandText}`}>
              {theme.id === 'neon-cactus' ? '🌵' : 'N'}
            </h1>
          ) : (
            <>
              <h1 className={`font-semibold text-base tracking-tight ${theme.brandText}`}>
                {theme.id === 'neon-cactus' ? '🌵 NCM Social' : 'NCM Social'}
              </h1>
              <p className={`text-xs mt-0.5 ${theme.brandSub}`}>Dashboard</p>
            </>
          )}
        </div>

        {/* Nav */}
        <div className={`px-3 py-3 border-b ${theme.sidebarBorder}`}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center ${isMinimized ? 'justify-center' : 'gap-2'} px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? theme.navItemActive : theme.navItemInactive
              }`
            }
            title="Overview"
          >
            <OverviewIcon />
            {!isMinimized && <span>Overview</span>}
          </NavLink>
        </div>

        {/* Search + view toggle (hidden when minimized) */}
        {!isMinimized && (
          <div className={`px-3 py-3 border-b ${theme.sidebarBorder} space-y-2`}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              className={`w-full text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 ${theme.searchInput}`}
            />
            <div className="flex gap-1">
              {[['grouped', 'Grouped'], ['az', 'A–Z']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={`flex-1 text-xs py-1 rounded-md transition-colors ${
                    view === key ? theme.viewBtnActive : theme.viewBtnInactive
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Client list (hidden when minimized) */}
        {!isMinimized ? (
          <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
            {view === 'az' ? (
              <>
                {filtered.length === 0 && (
                  <p className={`text-xs px-3 py-2 ${theme.noClients}`}>No clients found</p>
                )}
                {filtered.map(c => <ClientLink key={c.id} client={c} />)}
              </>
            ) : (
              <>
                {grouped.length === 0 && (
                  <p className={`text-xs px-3 py-2 ${theme.noClients}`}>No clients found</p>
                )}
                {grouped.map(([key, { label, color, clients: groupClients }]) => (
                  <div key={key} className="mb-1">
                    <button
                      onClick={() => toggleGroup(key)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${theme.groupBtn}`}
                    >
                      <span
                        className="w-2 h-2 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="flex-1 text-left truncate">{label}</span>
                      <span className={theme.groupArrow}>{collapsed[key] ? '›' : '⌄'}</span>
                    </button>
                    {!collapsed[key] && (
                      <div className="ml-2 mt-0.5 space-y-0.5">
                        {groupClients.map(c => <ClientLink key={c.id} client={c} />)}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </nav>
        ) : (
          <div className="flex-1" />
        )}

        {/* Admin link */}
        <div className={`px-3 py-3 border-t ${theme.sidebarBorder}`}>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center ${isMinimized ? 'justify-center' : 'gap-2'} px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? theme.adminLinkActive : theme.adminLinkInactive
              }`
            }
            title="Admin"
          >
            <GearIcon />
            {!isMinimized && <span>Admin</span>}
          </NavLink>
        </div>

        {/* Desktop collapse toggle */}
        <div className={`hidden md:block px-3 py-2 border-t ${theme.sidebarBorder}`}>
          <button
            onClick={toggleMinimized}
            className={`w-full flex items-center ${isMinimized ? 'justify-center' : 'justify-end'} px-3 py-1.5 rounded-lg text-xs transition-colors ${theme.navItemInactive}`}
            title={isMinimized ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <CollapseIcon collapsed={isMinimized} />
          </button>
        </div>
      </>
    )
  }

  return (
    <div className={`flex h-screen overflow-hidden ${theme.appBg}`}>

      {/* ── Mobile overlay ── */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ── Mobile sidebar drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col md:hidden transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarBgClass}`}
        style={sidebarStyle}
      >
        {/* Close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white z-10 rounded-lg"
        >
          <CloseIcon />
        </button>
        {renderSidebar(false)}
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
          minimized ? 'w-16' : 'w-64'
        } ${sidebarBgClass}`}
        style={sidebarStyle}
      >
        {renderSidebar(minimized)}
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className={`md:hidden sticky top-0 z-20 flex items-center gap-3 h-14 px-4 border-b ${theme.appBg} ${theme.tabsBar}`}>
          <button
            onClick={() => setMobileOpen(true)}
            className={`p-1.5 -ml-1 rounded-lg transition-colors ${theme.heading}`}
          >
            <HamburgerIcon />
          </button>
          <h1 className={`font-semibold text-sm ${theme.heading}`}>
            {theme.id === 'neon-cactus' ? '🌵 NCM Social' : 'NCM Social'}
          </h1>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
