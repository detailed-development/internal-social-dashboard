import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getClients } from '../../api'
import { useTheme } from '../../ThemeContext'

function ClientLink({ client, compact = false }) {
  const { theme } = useTheme()
  return (
    <NavLink
      to={`/clients/${client.slug}`}
      className={({ isActive }) =>
        [
          'group flex items-center gap-2 rounded-xl text-sm transition-all duration-200',
          compact ? 'px-2.5 py-2' : 'px-3 py-2',
          isActive ? theme.navItemActive : theme.navItemInactive,
        ].join(' ')
      }
      title={client.name}
    >
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
        style={{ backgroundColor: client.avatarColor || '#6366f1' }}
      />
      <span className="truncate">{client.name}</span>
    </NavLink>
  )
}

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
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
)

const AIToolsIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11h1a3 3 0 0 1 3 3v1h1a2 2 0 0 1 2 2v4h-6v-4a2 2 0 0 1 2-2h1v-1a1 1 0 0 0-1-1h-1v2h-2V9.5A4 4 0 0 1 12 2z" />
    <path d="M8 9.5V11H7a1 1 0 0 0-1 1v1h1a2 2 0 0 1 2 2v4H3v-4a2 2 0 0 1 2-2h1v-1a3 3 0 0 1 3-3h1V9.5A4.002 4.002 0 0 1 8 6a4 4 0 0 1 4-4" />
  </svg>
)

const PluginsIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2v6" />
    <path d="M15 2v6" />
    <path d="M5 8h14a1 1 0 0 1 1 1v3a6 6 0 0 1-6 6h-.5V22h-3v-4H10a6 6 0 0 1-6-6V9a1 1 0 0 1 1-1z" />
  </svg>
)

const GearIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const CollapseIcon = ({ collapsed }) => (
  <svg className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="11 17 6 12 11 7" />
    <polyline points="18 17 13 12 18 7" />
  </svg>
)

const SearchIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
)

function NavButton({ to, icon, label, isMinimized, activeClass, inactiveClass }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      title={label}
      className={({ isActive }) => [
        'flex items-center rounded-2xl transition-all duration-200',
        isMinimized ? 'justify-center w-11 h-11 mx-auto' : 'gap-3 w-full px-3 py-2.5',
        isActive ? activeClass : inactiveClass,
      ].join(' ')}
    >
      {icon}
      {!isMinimized && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

export default function Layout() {
  const { theme, sidebarColor } = useTheme()
  const location = useLocation()
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [view, setView] = useState('grouped')
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ncm_sidebar_collapsed') || '{}') } catch { return {} }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [minimized, setMinimized] = useState(() => {
    try { return localStorage.getItem('ncm_sidebar_minimized') === 'true' } catch { return false }
  })

  useEffect(() => { setMobileOpen(false) }, [location.pathname])
  useEffect(() => { getClients().then(setClients).catch(() => {}) }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter(client => client.name.toLowerCase().includes(q))
  }, [clients, search])

  const grouped = useMemo(() => {
    const map = {}
    for (const client of filtered) {
      const key = client.group?.slug || 'ungrouped'
      const label = client.group?.name || 'Ungrouped'
      const color = client.group?.avatarColor || '#94a3b8'
      const order = client.group?.sortOrder ?? 100
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

  const sidebarStyle = sidebarColor ? { backgroundColor: sidebarColor } : {}
  const sidebarBgClass = sidebarColor ? '' : theme.sidebar

  function renderClientPane(isMinimized = false) {
    if (isMinimized) {
      return <div className="flex-1" />
    }

    return (
      <>
        <div className={`px-4 py-4 border-b ${theme.sidebarBorder}`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className={`text-xs uppercase tracking-[0.18em] ${theme.brandSub}`}>Clients</p>
              <p className={`text-sm font-semibold ${theme.brandText}`}>{filtered.length} visible</p>
            </div>
            <div className={`text-[11px] px-2 py-1 rounded-full ${theme.code} ${theme.codeText || theme.muted}`}>
              {view === 'grouped' ? 'Grouped' : 'A–Z'}
            </div>
          </div>

          <div className="relative mb-3">
            <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.muted}`}>
              <SearchIcon />
            </span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              className={`w-full text-sm rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-1 ${theme.searchInput}`}
            />
          </div>

          <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl ${theme.code}`}>
            {[
              ['grouped', 'Grouped'],
              ['az', 'A–Z'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`text-xs py-1.5 rounded-lg transition-colors ${view === key ? theme.viewBtnActive : theme.viewBtnInactive}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
          {view === 'az' ? (
            <>
              {filtered.length === 0 && (
                <p className={`text-xs px-3 py-2 ${theme.noClients}`}>No clients found</p>
              )}
              {filtered.map(client => <ClientLink key={client.id} client={client} compact />)}
            </>
          ) : (
            <>
              {grouped.length === 0 && (
                <p className={`text-xs px-3 py-2 ${theme.noClients}`}>No clients found</p>
              )}
              {grouped.map(([key, { label, color, clients: groupClients }]) => (
                <div key={key} className="mb-2">
                  <button
                    onClick={() => toggleGroup(key)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${theme.groupBtn}`}
                  >
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="flex-1 text-left truncate">{label}</span>
                    <span className={theme.groupArrow}>{collapsed[key] ? '›' : '⌄'}</span>
                  </button>
                  {!collapsed[key] && (
                    <div className="mt-1 ml-2 space-y-1 border-l border-white/10 pl-2">
                      {groupClients.map(client => <ClientLink key={client.id} client={client} compact />)}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </nav>
      </>
    )
  }

  function renderSidebar(isMobile = false) {
    const isMinimized = !isMobile && minimized

    return (
      <div className="flex h-full min-h-0">
        <div className={`flex w-16 flex-col border-r min-h-0 ${theme.sidebarBorder}`}>
          <div className={`px-2 py-4 border-b flex-shrink-0 ${theme.sidebarBorder}`}>
            <div className={`w-10 h-10 mx-auto rounded-2xl flex items-center justify-center text-lg font-bold ${theme.navItemActive}`}>
              {theme.id === 'neon-cactus' ? '🌵' : 'N'}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-2">
            <NavButton
              to="/"
              icon={<OverviewIcon />}
              label="Client Analytics"
              isMinimized
              activeClass={theme.navItemActive}
              inactiveClass={theme.navItemInactive}
            />
            <NavButton
              to="/tools-plugins"
              icon={<PluginsIcon />}
              label="Tools & Plugins"
              isMinimized
              activeClass={theme.navItemActive}
              inactiveClass={theme.navItemInactive}
            />
          </div>

          <div className="flex-shrink-0 px-2 py-3 space-y-2 border-t border-white/10">
            <NavButton
              to="/admin"
              icon={<GearIcon />}
              label="Admin"
              isMinimized
              activeClass={theme.adminLinkActive}
              inactiveClass={theme.adminLinkInactive}
            />
            {!isMobile && (
              <button
                onClick={toggleMinimized}
                className={`flex items-center justify-center w-11 h-11 mx-auto rounded-2xl transition-colors ${theme.navItemInactive}`}
                title={isMinimized ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <CollapseIcon collapsed={isMinimized} />
              </button>
            )}
          </div>
        </div>

        {!isMinimized && (
          <div className="flex min-w-0 flex-1 flex-col">
            <div className={`px-4 py-4 border-b ${theme.sidebarBorder}`}>
              <h1 className={`font-semibold text-base tracking-tight ${theme.brandText}`}>
                {theme.id === 'neon-cactus' ? '🌵 NCM Social' : 'NCM Social'}
              </h1>
              <p className={`text-xs mt-0.5 ${theme.brandSub}`}>Dashboard workspace</p>
            </div>
            {renderClientPane(false)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`flex h-screen overflow-hidden ${theme.appBg}`}>
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-80 md:hidden transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarBgClass}`}
        style={sidebarStyle}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white z-10 rounded-lg"
        >
          <CloseIcon />
        </button>
        {renderSidebar(true)}
      </aside>

      <aside
        className={`hidden md:flex flex-shrink-0 overflow-x-hidden transition-all duration-300 ease-in-out ${minimized ? 'w-16' : 'w-auto'} ${sidebarBgClass}`}
        style={sidebarStyle}
      >
        {renderSidebar(false)}
      </aside>

      <main className="flex-1 overflow-y-auto min-w-0">
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
