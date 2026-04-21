import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getPlugins,
  createPlugin,
  updatePlugin,
  deletePlugin,
  getBunnyStatus,
  uploadPluginToBunny,
  uploadPluginVersionToBunny,
  deletePluginVersion,
} from '../api'

function groupByCategory(plugins) {
  const map = {}
  for (const plugin of plugins) {
    const key = plugin.category || 'General'
    if (!map[key]) map[key] = []
    map[key].push(plugin)
  }
  return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
}

export function usePlugins() {
  const [plugins, setPlugins] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [bunnyAvailable, setBunnyAvailable] = useState(false)

  useEffect(() => {
    let cancelled = false

    getPlugins()
      .then((data) => {
        if (!cancelled) {
          setPlugins(data)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    getBunnyStatus()
      .then((status) => {
        if (!cancelled) {
          setBunnyAvailable(Boolean(status?.configured))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBunnyAvailable(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const grouped = useMemo(() => {
    const filtered = filterCategory
      ? plugins.filter((plugin) => (plugin.category || 'General') === filterCategory)
      : plugins
    return groupByCategory(filtered)
  }, [filterCategory, plugins])

  const allCategories = useMemo(() => {
    const categories = new Set(plugins.map((plugin) => plugin.category || 'General'))
    return Array.from(categories).sort()
  }, [plugins])

  const openCreateForm = useCallback(() => {
    setEditing(null)
    setFormOpen(true)
  }, [])

  const openEditForm = useCallback((plugin) => {
    setEditing(plugin)
    setFormOpen(true)
  }, [])

  const closeForm = useCallback(() => {
    setEditing(null)
    setFormOpen(false)
  }, [])

  const handleSave = useCallback(async (data) => {
    const { useBunny, onProgress, ...payload } = data

    try {
      if (editing) {
        const updated = await updatePlugin(editing.id, payload)
        setPlugins((current) => current.map((plugin) => (plugin.id === updated.id ? updated : plugin)))
      } else if (useBunny) {
        const created = await uploadPluginToBunny(payload, onProgress)
        setPlugins((current) => [...current, created])
      } else {
        const created = await createPlugin(payload)
        setPlugins((current) => [...current, created])
      }

      closeForm()
    } catch (err) {
      const status = err?.response?.status
      const serverMsg = err?.response?.data?.error
      const parts = [
        serverMsg || err?.message || 'Failed to save plugin.',
        status ? `(HTTP ${status})` : err?.code ? `(${err.code})` : null,
      ].filter(Boolean)
      console.error('[plugin save failed]', err)
      alert(parts.join(' '))
    }
  }, [closeForm, editing])

  const handleDelete = useCallback(async (id) => {
    try {
      await deletePlugin(id)
      setPlugins((current) => current.filter((plugin) => plugin.id !== id))
    } catch {
      alert('Failed to delete plugin.')
    }
  }, [])

  const handleUploadVersion = useCallback(async (id, data) => {
    const { onProgress, ...rest } = data

    try {
      const updated = await uploadPluginVersionToBunny(id, rest, onProgress)
      setPlugins((current) => current.map((plugin) => (plugin.id === updated.id ? updated : plugin)))
    } catch (err) {
      const status = err?.response?.status
      const serverMsg = err?.response?.data?.error
      const parts = [
        serverMsg || err?.message || 'Failed to upload version.',
        status ? `(HTTP ${status})` : err?.code ? `(${err.code})` : null,
      ].filter(Boolean)
      console.error('[plugin version upload failed]', err)
      alert(parts.join(' '))
      throw err
    }
  }, [])

  const handleDeleteVersion = useCallback(async (id, versionId) => {
    try {
      const updated = await deletePluginVersion(id, versionId)
      setPlugins((current) => current.map((plugin) => (plugin.id === updated.id ? updated : plugin)))
    } catch (err) {
      const serverMsg = err?.response?.data?.error
      alert(serverMsg || err?.message || 'Failed to delete version.')
    }
  }, [])

  return {
    plugins,
    loading,
    formOpen,
    editing,
    filterCategory,
    bunnyAvailable,
    grouped,
    allCategories,
    actions: {
      setFilterCategory,
      openCreateForm,
      openEditForm,
      closeForm,
      handleSave,
      handleDelete,
      handleUploadVersion,
      handleDeleteVersion,
    },
  }
}
