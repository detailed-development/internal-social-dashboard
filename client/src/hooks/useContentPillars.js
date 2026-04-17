import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getContentPillars,
  createContentPillar,
  updateContentPillar,
  deleteContentPillar,
  assignPostToPillar,
  unassignPostFromPillar,
} from '../api'

export const PILLAR_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316',
]

export function useContentPillars({
  clientId,
  onFilterChange,
  onPillarsChange,
  onPostPillarChange,
}) {
  const [pillars, setPillars] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PILLAR_COLORS[0])
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [selectedPillarId, setSelectedPillarId] = useState(null)
  const [assigningPostId, setAssigningPostId] = useState(null)

  const syncPillars = useCallback((updated) => {
    setPillars(updated)
    onPillarsChange?.(updated)
  }, [onPillarsChange])

  useEffect(() => {
    if (!clientId) return

    let cancelled = false
    setLoading(true)

    getContentPillars(clientId)
      .then((data) => {
        if (cancelled) return
        syncPillars(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [clientId, syncPillars])

  const activePillar = useMemo(
    () => pillars.find((pillar) => pillar.id === selectedPillarId) ?? null,
    [pillars, selectedPillarId]
  )

  const toggleOpen = useCallback(() => {
    setOpen((current) => !current)
  }, [])

  const selectPillar = useCallback((pillarId) => {
    setSelectedPillarId((current) => {
      const next = current === pillarId ? null : pillarId
      onFilterChange?.(next)
      return next
    })
  }, [onFilterChange])

  const startEditing = useCallback((pillar) => {
    setEditingId(pillar.id)
    setEditName(pillar.name)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingId(null)
    setEditName('')
  }, [])

  const createPillar = useCallback(async (event) => {
    event.preventDefault()
    if (!clientId || !newName.trim()) return

    setCreating(true)

    try {
      const pillar = await createContentPillar({
        clientId,
        name: newName.trim(),
        color: newColor,
      })

      syncPillars([...pillars, { ...pillar, _count: { posts: 0 } }])
      setNewName('')
    } catch {
    } finally {
      setCreating(false)
    }
  }, [clientId, newColor, newName, pillars, syncPillars])

  const renamePillar = useCallback(async (pillarId) => {
    if (!editName.trim()) return

    try {
      const updated = await updateContentPillar(pillarId, { name: editName.trim() })
      syncPillars(
        pillars.map((pillar) => (pillar.id === pillarId ? { ...pillar, ...updated } : pillar))
      )
    } catch {
    } finally {
      cancelEditing()
    }
  }, [cancelEditing, editName, pillars, syncPillars])

  const removePillar = useCallback(async (pillarId) => {
    try {
      await deleteContentPillar(pillarId)
      const next = pillars.filter((pillar) => pillar.id !== pillarId)
      syncPillars(next)

      if (selectedPillarId === pillarId) {
        setSelectedPillarId(null)
        onFilterChange?.(null)
      }
    } catch {}
  }, [onFilterChange, pillars, selectedPillarId, syncPillars])

  const togglePostAssignment = useCallback(async ({ pillarId, postId, isAssigned }) => {
    setAssigningPostId(postId)

    try {
      if (isAssigned) {
        await unassignPostFromPillar(pillarId, postId)
      } else {
        await assignPostToPillar(pillarId, postId)
      }

      const next = pillars.map((pillar) => {
        if (pillar.id !== pillarId) return pillar

        const previousCount = pillar._count?.posts ?? 0
        const nextCount = isAssigned ? previousCount - 1 : previousCount + 1

        return {
          ...pillar,
          _count: { posts: Math.max(0, nextCount) },
        }
      })

      syncPillars(next)
      onPostPillarChange?.(pillarId, postId, isAssigned)
    } catch {
    } finally {
      setAssigningPostId(null)
    }
  }, [onPostPillarChange, pillars, syncPillars])

  return {
    pillars,
    loading,
    open,
    newName,
    newColor,
    creating,
    editingId,
    editName,
    selectedPillarId,
    assigningPostId,
    activePillar,
    actions: {
      toggleOpen,
      setNewName,
      setNewColor,
      selectPillar,
      createPillar,
      startEditing,
      setEditName,
      cancelEditing,
      renamePillar,
      removePillar,
      togglePostAssignment,
    },
  }
}
