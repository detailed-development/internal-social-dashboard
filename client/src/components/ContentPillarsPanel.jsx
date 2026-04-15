import { useEffect, useState } from 'react'
import { useTheme } from '../ThemeContext'
import {
  getContentPillars, createContentPillar, updateContentPillar,
  deleteContentPillar, assignPostToPillar, unassignPostFromPillar,
} from '../api'

const PILLAR_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316',
]

export default function ContentPillarsPanel({ clientId, posts = [], onFilterChange }) {
  const { theme } = useTheme()
  const [pillars, setPillars] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PILLAR_COLORS[0])
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [selectedPillarId, setSelectedPillarId] = useState(null)
  const [assigningPostId, setAssigningPostId] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!clientId) return
    getContentPillars(clientId)
      .then(setPillars)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  async function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const pillar = await createContentPillar({ clientId, name: newName.trim(), color: newColor })
      setPillars(prev => [...prev, { ...pillar, _count: { posts: 0 } }])
      setNewName('')
    } catch {}
    setCreating(false)
  }

  async function handleRename(id) {
    if (!editName.trim()) return
    try {
      const updated = await updateContentPillar(id, { name: editName.trim() })
      setPillars(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p))
    } catch {}
    setEditingId(null)
  }

  async function handleDelete(id) {
    try {
      await deleteContentPillar(id)
      setPillars(prev => prev.filter(p => p.id !== id))
      if (selectedPillarId === id) {
        setSelectedPillarId(null)
        onFilterChange?.(null)
      }
    } catch {}
  }

  async function handleToggleAssignment(pillarId, postId, isAssigned) {
    setAssigningPostId(postId)
    try {
      if (isAssigned) {
        await unassignPostFromPillar(pillarId, postId)
      } else {
        await assignPostToPillar(pillarId, postId)
      }
      // Update local post pillar data (optimistic)
      setPillars(prev => prev.map(p => {
        if (p.id !== pillarId) return p
        const newCount = isAssigned ? (p._count?.posts || 1) - 1 : (p._count?.posts || 0) + 1
        return { ...p, _count: { posts: Math.max(0, newCount) } }
      }))
    } catch {}
    setAssigningPostId(null)
  }

  function handleSelectPillar(pillarId) {
    const next = selectedPillarId === pillarId ? null : pillarId
    setSelectedPillarId(next)
    onFilterChange?.(next)
  }

  if (loading) return null

  const activePillar = pillars.find(p => p.id === selectedPillarId)

  return (
    <div className={`border rounded-xl mb-8 overflow-hidden ${theme.card}`}>
      {/* Header row */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-5 py-3 text-left transition-colors hover:opacity-80`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${theme.heading}`}>Content Pillars</span>
          {pillars.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${theme.code} ${theme.muted}`}>{pillars.length}</span>
          )}
          {selectedPillarId && activePillar && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
              style={{ backgroundColor: activePillar.color || '#6366f1' }}
            >
              Filtering: {activePillar.name}
            </span>
          )}
        </div>
        <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? '' : '-rotate-90'} ${theme.muted}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className={`border-t px-5 py-4 space-y-4 ${theme.cardDivider}`}>
          {/* Pillar list */}
          {pillars.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pillars.map(p => (
                <div key={p.id} className="flex items-center gap-1">
                  {editingId === p.id ? (
                    <form onSubmit={(e) => { e.preventDefault(); handleRename(p.id) }} className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className={`text-xs rounded-lg border px-2 py-1 focus:outline-none w-28 ${theme.input}`}
                      />
                      <button type="submit" className={`text-xs px-2 py-1 rounded-lg ${theme.btnPrimary}`}>Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className={`text-xs px-2 py-1 rounded-lg border ${theme.btnCancel}`}>✕</button>
                    </form>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSelectPillar(p.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                          selectedPillarId === p.id
                            ? 'text-white border-transparent shadow-sm'
                            : `${theme.code} ${theme.body} border-transparent`
                        }`}
                        style={selectedPillarId === p.id ? { backgroundColor: p.color || '#6366f1' } : {}}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color || '#6366f1' }} />
                        {p.name}
                        <span className={`${selectedPillarId === p.id ? 'text-white/70' : theme.muted} text-[10px]`}>
                          {p._count?.posts ?? 0}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingId(p.id); setEditName(p.name) }}
                        className={`text-[10px] px-1.5 py-0.5 rounded ${theme.navItemInactive}`}
                        title="Rename"
                      >✎</button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="text-[10px] px-1.5 py-0.5 rounded text-red-400 hover:text-red-600"
                        title="Delete pillar"
                      >✕</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {pillars.length === 0 && (
            <p className={`text-xs ${theme.muted}`}>No content pillars yet. Create one below.</p>
          )}

          {/* Create pillar form */}
          <form onSubmit={handleCreate} className="flex items-center gap-2 flex-wrap">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="New pillar name…"
              className={`text-sm rounded-lg border px-3 py-1.5 focus:outline-none flex-1 min-w-[160px] ${theme.input}`}
            />
            <div className="flex gap-1">
              {PILLAR_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-current' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${theme.btnPrimary}`}
            >
              {creating ? '…' : 'Add'}
            </button>
          </form>

          {/* Post assignment — only shown when a pillar is selected */}
          {selectedPillarId && posts.length > 0 && (
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.14em] mb-2 ${theme.subtext}`}>
                Toggle posts for "{activePillar?.name}"
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {posts.map(post => {
                  const isAssigned = post.pillars?.some(pa => pa.contentPillarId === selectedPillarId)
                  return (
                    <button
                      key={post.id}
                      type="button"
                      disabled={assigningPostId === post.id}
                      onClick={() => handleToggleAssignment(selectedPillarId, post.id, isAssigned)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                        isAssigned ? 'bg-indigo-50 border border-indigo-200 text-indigo-800' : `${theme.code} ${theme.body} border border-transparent`
                      }`}
                    >
                      <span className={`w-3 h-3 rounded flex-shrink-0 border-2 ${isAssigned ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`} />
                      <span className="truncate flex-1">{post.caption?.slice(0, 80) || `Post ${post.id.slice(0, 8)}`}</span>
                      <span className={theme.muted}>{new Date(post.publishedAt).toLocaleDateString()}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
