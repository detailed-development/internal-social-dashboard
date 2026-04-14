import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getClients } from '../../api'
import { useTheme } from '../../ThemeContext'

function ClientLink({ client, subtle = false }) {
  const { theme } = useTheme()
  return (
    <NavLink
      to={`/clients/${client.slug}`}
      className={({ isActive }) =>
        [
          'flex items-center gap-2 rounded-xl text-sm transition-all duration-200',
          subtle ? 'px-2.5 py-2' : 'px-3 py-2',
          isActive ? theme.navItemActive : theme.navItemInactive,
        ].join(' ')
      }
      title={client.name}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
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

const SparkIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
  </svg>
)

function SidebarItem({ to, label, icon, minimized, activeClass, inactiveClass, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      className={({ isActive }) => [
        'flex items-center rounded-xl text-sm transition-all duration-200',
        minimized ? 'justify-center w-11 h-11' : 'gap-3 px-3 py-2.5',
        isActive ? activeClass : inactiveClass,
      ].join(' ')}
    >
      {icon}
      {!minimized && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

function getContext(pathname) {
  if (pathname === '/') {
    return {
      title: 'Overview workspace',
      description: 'Monitor the whole dashboard and jump into client detail faster.',
      badge: 'Dashboard',
    }
  }

  if (pathname.startsWith('/ai-tools')) {
    return {
      title: 'AI workspace',
      description: 'Keep content tools close while preserving access to clients and admin.',
      badge: 'Content tools',
    }
  }

  if (pathname.startsWith('/admin')) {
    return {
      title: 'Admin workspace',
      description: 'Stay oriented while adjusting settings and integrations.',
      badge: 'Admin',
    }
  }

  return {
    title: 'Client workspace',
    description: 'Review a specific client while keeping navigation and browse tools visible.',
    badge: 'Client detail',
  }
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
  const [clientPaneOpen, setClientPaneOpen] = useState(true)

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

  const context = useMemo(() => getContext(location.pathname), [location.pathname])

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

  function renderSidebar(isMinimized) {
    return (
      <>
        <div className={`${isMinimized ? 'px-2 py-4' : 'px-4 py-4'} border-b ${theme.sidebarBorder}`}>
          {isMinimized ? (
            <div className={`w-10 h-10 mx-auto rounded-2xl flex items-center justify-center text-lg font-bold ${theme.navItemActive}`}>
              {theme.id === 'neon-cactus' ? '🌵' : 'N'}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h1 className={`font-semibold text-base tracking-tight ${theme.brandText}`}>
                    {theme.id === 'neon-cactus' ? '🌵 NCM Social' : 'NCM Social'}
                  </h1>
                  <p className={`text-xs mt-0.5 ${theme.brandSub}`}>Adaptive sidebar</p>
                </div>
                <div className={`text-[11px] px-2 py-1 rounded-full ${theme.code} ${theme.codeText || theme.muted}`}>
                  {context.badge}
                </div>
              </div>

              <div className={`rounded-2xl border p-3 ${theme.card}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${theme.accentIconBg} ${theme.accentIconText}`}>
                    <SparkIcon />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${theme.heading}`}>{context.title}</p>
                    <p className={`text-xs mt-1 leading-relaxed ${theme.subtext}`}>{context.description}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className={`px-3 py-3 border-b ${theme.sidebarBorder}`}>
          <div className="space-y-2">
            <SidebarItem
              to="/"
              end
              label="Overview"
              icon={<OverviewIcon />}
              minimized={isMinimized}
              activeClass={theme.navItemActive}
              inactiveClass={theme.navItemInactive}
            />
          </div>
        </div>

        {!isMinimized && (
          <div className={`px-3 py-3 border-b ${theme.sidebarBorder}`}>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className={`rounded-xl border px-3 py-2 ${theme.card}`}>
                <p className={`text-[11px] uppercase tracking-[0.16em] ${theme.subtext}`}>Clients</p>
                <p className={`text-lg font-semibold mt-1 ${theme.heading}`}>{clients.length}</p>
              </div>
              <div className={`rounded-xl border px-3 py-2 ${theme.card}`}>
                <p className={`text-[11px] uppercase tracking-[0.16em] ${theme.subtext}`}>Visible</p>
                <p className={`text-lg font-semibold mt-1 ${theme.heading}`}>{filtered.length}</p>
              </div>
            </div>

            <button
              onClick={() => setClientPaneOpen(v => !v)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${theme.groupBtn}`}
            >
              <span className="font-medium">Client browser</span>
              <span className={theme.groupArrow}>{clientPaneOpen ? '⌄' : '›'}</span>
            </button>
          </div>
        )}

        {!isMinimized && clientPaneOpen ? (
          <>
            <div className={`px-3 pb-3 ${theme.sidebarBorder}`}>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search clients..."
                className={`w-full text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 ${theme.searchInput}`}
              />
              <div className={`mt-2 flex gap-1 p-1 rounded-xl ${theme.code}`}>
                {[
                  ['grouped', 'Grouped'],
                  ['az', 'A–Z'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${view === key ? theme.viewBtnActive : theme.viewBtnInactive}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <nav className="flex-1 px-3 pb-3 overflow-y-auto space-y-1">
              {view === 'az' ? (
                <>
                  {filtered.length === 0 && (
                    <p className={`text-xs px-3 py-2 ${theme.noClients}`}>No clients found</p>
                  )}
                  {filtered.map(client => <ClientLink key={client.id} client={client} subtle />)}
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
                        <div className="mt-1 ml-2 space-y-1 pl-2 border-l border-white/10">
                          {groupClients.map(client => <ClientLink key={client.id} client={client} subtle />)}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </nav>
          </>
        ) : (
          <div className="flex-1" />
        )}

        <div className={`px-3 py-3 border-t ${theme.sidebarBorder}`}>
          <div className="space-y-2">
            <SidebarItem
              to="/admin"
              label="Admin"
              icon={<GearIcon />}
              minimized={isMinimized}
              activeClass={theme.adminLinkActive}
              inactiveClass={theme.adminLinkInactive}
            />
            <button
              onClick={toggleMinimized}
              className={`hidden md:flex items-center ${isMinimized ? 'justify-center w-11 h-11' : 'justify-between w-full px-3 py-2.5'} rounded-xl text-sm transition-colors ${theme.navItemInactive}`}
              title={isMinimized ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {!isMinimized && <span>Collapse sidebar</span>}
              <CollapseIcon collapsed={isMinimized} />
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className={`flex h-screen overflow-hidden ${theme.appBg}`}>
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col md:hidden transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarBgClass}`}
        style={sidebarStyle}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white z-10 rounded-lg"
        >
          <CloseIcon />
        </button>
        {renderSidebar(false)}
      </aside>

      <aside
        className={`hidden md:flex flex-col flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${minimized ? 'w-16' : 'w-80'} ${sidebarBgClass}`}
        style={sidebarStyle}
      >
        {renderSidebar(minimized)}
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
