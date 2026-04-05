import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { getClients } from '../api'
import { useTheme } from '../ThemeContext'

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

export default function Layout() {
  const { theme } = useTheme()
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [view, setView] = useState('grouped') // 'grouped' | 'az'
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ncm_sidebar_collapsed') || '{}') } catch { return {} }
  })

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

  return (
    <div className={`flex h-screen overflow-hidden ${theme.appBg}`}>
      <aside className={`w-64 flex flex-col flex-shrink-0 ${theme.sidebar}`}>
        {/* Branding */}
        <div className={`px-5 py-4 border-b ${theme.sidebarBorder}`}>
          <h1 className={`font-semibold text-base tracking-tight ${theme.brandText}`}>
            {theme.id === 'neon-cactus' ? '🌵 NCM Social' : 'NCM Social'}
          </h1>
          <p className={`text-xs mt-0.5 ${theme.brandSub}`}>Dashboard</p>
        </div>

        {/* Nav */}
        <div className={`px-3 py-3 border-b ${theme.sidebarBorder}`}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? theme.navItemActive : theme.navItemInactive
              }`
            }
          >
            Overview
          </NavLink>
          <NavLink
            to="/ai-tools"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? theme.navItemActive : theme.navItemInactive
              }`
            }
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11h1a3 3 0 0 1 3 3v1h1a2 2 0 0 1 2 2v4h-6v-4a2 2 0 0 1 2-2h1v-1a1 1 0 0 0-1-1h-1v2h-2V9.5A4 4 0 0 1 12 2z"/>
              <path d="M8 9.5V11H7a1 1 0 0 0-1 1v1h1a2 2 0 0 1 2 2v4H3v-4a2 2 0 0 1 2-2h1v-1a3 3 0 0 1 3-3h1V9.5A4.002 4.002 0 0 1 8 6a4 4 0 0 1 4-4"/>
            </svg>
            AI Tools
          </NavLink>
        </div>

        {/* Search + view toggle */}
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

        {/* Client list */}
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

        {/* Admin link */}
        <div className={`px-3 py-3 border-t ${theme.sidebarBorder}`}>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? theme.adminLinkActive : theme.adminLinkInactive
              }`
            }
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Admin
          </NavLink>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
