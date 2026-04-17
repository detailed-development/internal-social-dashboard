import { useEffect, useMemo, useState } from 'react'
import { useTheme } from '../ThemeContext'
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
  for (const p of plugins) {
    const key = p.category || 'General'
    if (!map[key]) map[key] = []
    map[key].push(p)
  }
  return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
}

function inferFileType(name = '') {
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

const TEXT_FILE_EXTENSIONS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'php', 'css', 'scss', 'html', 'htm',
  'json', 'md', 'txt', 'sh', 'py', 'sql', 'yml', 'yaml', 'xml',
])

function isReadableTextFile(file) {
  if (!file) return false
  const ext = inferFileType(file.name)
  return file.type.startsWith('text/') || TEXT_FILE_EXTENSIONS.has(ext) || !file.type
}

function mimeFromExtension(ext) {
  const map = {
    js: 'text/javascript',
    jsx: 'text/javascript',
    ts: 'text/plain',
    tsx: 'text/plain',
    php: 'application/x-httpd-php',
    css: 'text/css',
    html: 'text/html',
    htm: 'text/html',
    json: 'application/json',
    md: 'text/markdown',
    txt: 'text/plain',
    sh: 'application/x-sh',
    py: 'text/x-python',
    sql: 'application/sql',
    yml: 'text/yaml',
    yaml: 'text/yaml',
    xml: 'application/xml',
  }
  return map[ext] || 'text/plain;charset=utf-8'
}

function downloadStoredFile(plugin) {
  const ext = plugin.fileType || inferFileType(plugin.fileName) || 'txt'
  const blob = new Blob([plugin.content || ''], { type: mimeFromExtension(ext) })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = plugin.fileName || `plugin.${ext}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatVersionDate(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

function NewVersionForm({ theme, onCancel, onSubmit }) {
  const [version, setVersion] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  function handleFile(e) {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (!selected.name.toLowerCase().endsWith('.zip')) {
      setError('Only .zip files are supported.')
      e.target.value = ''
      return
    }
    setFile(selected)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) return
    setSaving(true)
    setProgress(0)
    try {
      await onSubmit({ version, file, onProgress: setProgress })
    } finally {
      setSaving(false)
      setProgress(0)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`mt-2 rounded-lg border p-3 space-y-2 ${theme.card}`}>
      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2">
        <input
          value={version}
          onChange={e => setVersion(e.target.value)}
          placeholder="Version (e.g. 1.0.1)"
          className={`text-xs rounded border px-2 py-1 focus:outline-none ${theme.input}`}
        />
        <input
          type="file"
          accept=".zip,application/zip"
          onChange={handleFile}
          disabled={saving}
          className={`block w-full text-xs rounded border px-2 py-1 focus:outline-none ${theme.input}`}
        />
      </div>
      {saving && file && progress > 0 && (
        <div>
          <div className="h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
            <div
              className={`h-full bg-emerald-500 transition-all ${progress >= 100 ? 'animate-pulse' : ''}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className={`text-[10px] mt-1 ${theme.muted}`}>
            {progress >= 100 ? 'Transferring to Bunny CDN…' : `Uploading… ${progress}%`}
          </p>
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving || !file}
          className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-colors ${theme.btnPrimary}`}
        >
          {saving ? '…' : 'Upload version'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors ${theme.btnCancel}`}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function PluginNode({ plugin, theme, onEdit, onDelete, onUploadVersion, onDeleteVersion, bunnyAvailable }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [newVersionOpen, setNewVersionOpen] = useState(false)

  async function handleCopy() {
    if (!plugin.content) return
    try {
      await navigator.clipboard.writeText(plugin.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  const hasStoredFile = Boolean(plugin.content && plugin.fileName)
  const isManagedZip = plugin.downloadUrl?.startsWith('/_plugin_uploads/')
  const isBunnyZip = plugin.storageProvider === 'bunny'
  const ingestBadge = plugin.ingestStatus && plugin.ingestStatus !== 'ready'
    ? plugin.ingestStatus
    : null
  const versions = plugin.versions || []
  const canAddVersion = isBunnyZip && bunnyAvailable

  async function handleUploadVersion(data) {
    try {
      await onUploadVersion(plugin.id, data)
      setNewVersionOpen(false)
    } catch {}
  }

  return (
    <div className={`border rounded-xl p-4 flex flex-col gap-3 ${theme.card}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`font-semibold text-sm truncate ${theme.heading}`}>{plugin.title}</p>
          <p className={`text-[11px] uppercase tracking-wide mt-0.5 ${theme.muted}`}>
            {plugin.category}
            {plugin.version ? ` · v${plugin.version.replace(/^v/i, '')}` : ''}
            {plugin.fileType ? ` · ${plugin.fileType}` : ''}
            {isBunnyZip ? ' · bunny' : ''}
          </p>
          {ingestBadge && (
            <p className="text-[10px] mt-0.5 text-amber-500 font-semibold uppercase">
              {ingestBadge}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className={`text-[10px] px-2 py-1 rounded border font-medium transition-colors ${theme.navItemInactive}`}
            title="Edit plugin"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete "${plugin.title}" and all its versions?`)) onDelete(plugin.id)
            }}
            className="text-[10px] px-2 py-1 rounded text-red-400 hover:text-red-600 font-medium"
            title="Delete plugin"
          >
            ✕
          </button>
        </div>
      </div>

      {plugin.description && (
        <p className={`text-xs ${theme.body}`}>{plugin.description}</p>
      )}

      {plugin.content && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className={`text-[11px] font-medium mb-1 ${theme.subtext} hover:opacity-80`}
          >
            {expanded ? 'Hide content ▲' : 'Show content ▼'}
          </button>
          {expanded && (
            <textarea
              readOnly
              value={plugin.content}
              className={`w-full h-36 text-xs font-mono rounded border px-2 py-1.5 focus:outline-none ${theme.input}`}
            />
          )}
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopy}
              className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-colors ${theme.btnPrimary}`}
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>

            {hasStoredFile && (
              <button
                type="button"
                onClick={() => downloadStoredFile(plugin)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-colors ${theme.btnCancel}`}
              >
                ⬇ Download {plugin.fileName}
              </button>
            )}
          </div>
        </div>
      )}

      {isManagedZip ? (
        <a
          href={`/api/plugins/${plugin.id}/download`}
          className={`inline-flex items-center justify-center text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-colors ${theme.btnCancel}`}
        >
          ⬇ Download {plugin.fileName || 'zip'}
        </a>
      ) : (
        !hasStoredFile && !isBunnyZip && plugin.downloadUrl && (
          <a
            href={plugin.downloadUrl}
            download={plugin.fileName || true}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center justify-center text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-colors ${theme.btnCancel}`}
          >
            ⬇ Download{plugin.fileName ? ` ${plugin.fileName}` : ''}
          </a>
        )
      )}

      {isBunnyZip && versions.length > 0 && (
        <div className="pt-2 border-t border-current/10">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setVersionsOpen(v => !v)}
              className={`text-[11px] font-semibold ${theme.subtext} hover:opacity-80`}
            >
              Versions ({versions.length}) {versionsOpen ? '▲' : '▼'}
            </button>
            {canAddVersion && !newVersionOpen && (
              <button
                type="button"
                onClick={() => { setNewVersionOpen(true); setVersionsOpen(true) }}
                className={`text-[11px] px-2 py-0.5 rounded-lg font-semibold transition-colors ${theme.btnPrimary}`}
              >
                + New version
              </button>
            )}
          </div>

          {versionsOpen && (
            <ul className="mt-2 space-y-1.5">
              {versions.map(v => (
                <li
                  key={v.id}
                  className={`flex items-center justify-between gap-2 text-[11px] rounded-lg border px-2 py-1.5 ${theme.card}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`font-semibold ${theme.heading}`}>
                        {v.version || 'unversioned'}
                      </span>
                      {plugin.storageKey === v.storageKey && v.storageKey && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-semibold uppercase">
                          current
                        </span>
                      )}
                    </div>
                    <div className={`${theme.muted} text-[10px] truncate`}>
                      {v.fileName}{v.fileSize ? ` · ${formatFileSize(v.fileSize)}` : ''}{v.createdAt ? ` · ${formatVersionDate(v.createdAt)}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {v.downloadUrl && (
                      <a
                        href={v.downloadUrl}
                        download={v.fileName || true}
                        target="_blank"
                        rel="noreferrer"
                        className={`text-[10px] px-2 py-0.5 rounded border font-semibold transition-colors ${theme.btnCancel}`}
                        title="Download version"
                      >
                        ⬇
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete version "${v.version || 'unversioned'}"?`)) {
                          onDeleteVersion(plugin.id, v.id)
                        }
                      }}
                      className="text-[10px] px-2 py-0.5 rounded text-red-400 hover:text-red-600 font-medium"
                      title="Delete version"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {newVersionOpen && (
            <NewVersionForm
              theme={theme}
              onCancel={() => setNewVersionOpen(false)}
              onSubmit={handleUploadVersion}
            />
          )}
        </div>
      )}

      {isBunnyZip && versions.length === 0 && canAddVersion && (
        <div className="pt-2 border-t border-current/10">
          {newVersionOpen ? (
            <NewVersionForm
              theme={theme}
              onCancel={() => setNewVersionOpen(false)}
              onSubmit={handleUploadVersion}
            />
          ) : (
            <button
              type="button"
              onClick={() => setNewVersionOpen(true)}
              className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-colors ${theme.btnPrimary}`}
            >
              + Upload version
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function PluginForm({ initial, theme, onCancel, onSave, bunnyAvailable }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    category: initial?.category || 'General',
    description: initial?.description || '',
    version: initial?.version || '',
    content: initial?.content || '',
    downloadUrl: initial?.downloadUrl || '',
    fileName: initial?.fileName || '',
    fileType: initial?.fileType || '',
  })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [useBunny, setUseBunny] = useState(Boolean(bunnyAvailable && !initial))
  const [progress, setProgress] = useState(0)

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleZipChange(e) {
    const selected = e.target.files?.[0]
    if (!selected) return

    const ext = inferFileType(selected.name)
    if (ext !== 'zip') {
      setUploadError('Only .zip files are supported here.')
      e.target.value = ''
      return
    }

    setFile(selected)
    setForm(f => ({
      ...f,
      title: f.title || selected.name.replace(/\.zip$/i, ''),
      content: '',
      downloadUrl: '',
      fileName: selected.name,
      fileType: 'zip',
    }))
    setUploadError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return

    setSaving(true)
    setProgress(0)
    try {
      await onSave({
        ...form,
        category: form.category.trim() || 'General',
        file,
        useBunny: useBunny && !!file && !initial,
        onProgress: p => setProgress(p),
      })
    } finally {
      setSaving(false)
      setProgress(0)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`border rounded-xl p-4 space-y-3 ${theme.card}`}>
      <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${theme.subtext}`}>
        {initial ? 'Edit plugin' : 'New plugin'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          value={form.title}
          onChange={e => update('title', e.target.value)}
          placeholder="Title"
          className={`text-sm rounded-lg border px-3 py-1.5 focus:outline-none ${theme.input}`}
          required
        />
        <input
          value={form.category}
          onChange={e => update('category', e.target.value)}
          placeholder="Category (e.g. WordPress, Scripts)"
          className={`text-sm rounded-lg border px-3 py-1.5 focus:outline-none ${theme.input}`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-2">
        <input
          value={form.description}
          onChange={e => update('description', e.target.value)}
          placeholder="Short description"
          className={`text-sm rounded-lg border px-3 py-1.5 focus:outline-none ${theme.input}`}
        />
        <input
          value={form.version}
          onChange={e => update('version', e.target.value)}
          placeholder="Version (e.g. 1.0.0)"
          className={`text-sm rounded-lg border px-3 py-1.5 focus:outline-none ${theme.input}`}
        />
      </div>

      <div className={`rounded-xl border p-3 ${theme.card}`}>
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <label className={`text-xs font-semibold uppercase tracking-[0.14em] ${theme.subtext}`}>
            Upload zip
          </label>
          {bunnyAvailable && !initial && (
            <label className={`inline-flex items-center gap-1.5 text-[11px] ${theme.body}`}>
              <input
                type="checkbox"
                checked={useBunny}
                onChange={e => setUseBunny(e.target.checked)}
              />
              Store on Bunny CDN
            </label>
          )}
        </div>
        <input
          type="file"
          accept=".zip,application/zip"
          onChange={handleZipChange}
          disabled={saving}
          className={`block w-full text-sm rounded-lg border px-3 py-2 focus:outline-none ${theme.input}`}
        />
        <p className={`text-[11px] mt-2 ${theme.muted}`}>
          {useBunny && !initial
            ? 'Uploads to Bunny CDN. Clears the content field below.'
            : 'Uploading a zip stores the file on the server and clears the content field below.'}
        </p>
        {file && (
          <p className={`text-[11px] mt-2 ${theme.body}`}>
            Selected: <strong>{file.name}</strong>
          </p>
        )}
        {saving && file && progress > 0 && (
          <div className="mt-2">
            <div className="h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
              <div
                className={`h-full bg-emerald-500 transition-all ${progress >= 100 ? 'animate-pulse' : ''}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className={`text-[10px] mt-1 ${theme.muted}`}>
              {progress >= 100
                ? (useBunny ? 'Transferring to Bunny CDN… this can take a minute for large files.' : 'Finalising…')
                : `Uploading… ${progress}%`}
            </p>
          </div>
        )}
        {uploadError && (
          <p className="text-xs text-red-500 mt-2">{uploadError}</p>
        )}
      </div>

      <textarea
        value={form.content}
        onChange={e => update('content', e.target.value)}
        placeholder="Paste script / snippet / prompt content here"
        rows={8}
        className={`w-full text-xs font-mono rounded-lg border px-3 py-2 focus:outline-none ${theme.input}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          value={form.fileName}
          onChange={e => update('fileName', e.target.value)}
          placeholder="File name"
          className={`text-sm rounded-lg border px-3 py-1.5 focus:outline-none ${theme.input}`}
        />
        <input
          value={form.fileType}
          onChange={e => update('fileType', e.target.value)}
          placeholder="File type"
          className={`text-sm rounded-lg border px-3 py-1.5 focus:outline-none ${theme.input}`}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving || !form.title.trim()}
          className={`text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors ${theme.btnPrimary}`}
        >
          {saving ? '…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${theme.btnCancel}`}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function ToolsPlugins() {
  const { theme } = useTheme()
  const [plugins, setPlugins] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [bunnyAvailable, setBunnyAvailable] = useState(false)

  useEffect(() => {
    getPlugins()
      .then(setPlugins)
      .catch(() => {})
      .finally(() => setLoading(false))
    getBunnyStatus()
      .then(s => setBunnyAvailable(Boolean(s?.configured)))
      .catch(() => setBunnyAvailable(false))
  }, [])

  const grouped = useMemo(() => {
    const filtered = filterCategory
      ? plugins.filter(p => (p.category || 'General') === filterCategory)
      : plugins
    return groupByCategory(filtered)
  }, [plugins, filterCategory])

  const allCategories = useMemo(() => {
    const set = new Set(plugins.map(p => p.category || 'General'))
    return Array.from(set).sort()
  }, [plugins])

  async function handleSave(data) {
    const { useBunny, onProgress, ...payload } = data
    try {
      if (editing) {
        const updated = await updatePlugin(editing.id, payload)
        setPlugins(list => list.map(p => (p.id === updated.id ? updated : p)))
      } else if (useBunny) {
        const created = await uploadPluginToBunny(payload, onProgress)
        setPlugins(list => [...list, created])
      } else {
        const created = await createPlugin(payload)
        setPlugins(list => [...list, created])
      }
      setFormOpen(false)
      setEditing(null)
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
  }

  async function handleDelete(id) {
    try {
      await deletePlugin(id)
      setPlugins(list => list.filter(p => p.id !== id))
    } catch {
      alert('Failed to delete plugin.')
    }
  }

  async function handleUploadVersion(id, data) {
    const { onProgress, ...rest } = data
    try {
      const updated = await uploadPluginVersionToBunny(id, rest, onProgress)
      setPlugins(list => list.map(p => (p.id === updated.id ? updated : p)))
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
  }

  async function handleDeleteVersion(id, versionId) {
    try {
      const updated = await deletePluginVersion(id, versionId)
      setPlugins(list => list.map(p => (p.id === updated.id ? updated : p)))
    } catch (err) {
      const serverMsg = err?.response?.data?.error
      alert(serverMsg || err?.message || 'Failed to delete version.')
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className={`text-2xl font-bold ${theme.heading}`}>Tools & Plugins</h2>
          <p className={`text-sm mt-1 ${theme.subtext}`}>
            Upload custom scripts, plugins, and snippets. Grouped by category.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {allCategories.length > 0 && (
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className={`text-xs rounded-lg border px-2 py-1 focus:outline-none ${theme.input}`}
            >
              <option value="">All categories</option>
              {allCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => { setEditing(null); setFormOpen(true) }}
            className={`text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors ${theme.btnPrimary}`}
          >
            + New
          </button>
        </div>
      </div>

      {formOpen && (
        <div className="mb-6">
          <PluginForm
            initial={editing}
            theme={theme}
            onCancel={() => { setFormOpen(false); setEditing(null) }}
            onSave={handleSave}
            bunnyAvailable={bunnyAvailable}
          />
        </div>
      )}

      {loading ? (
        <p className={`text-sm ${theme.muted}`}>Loading…</p>
      ) : plugins.length === 0 ? (
        <div className={`border rounded-xl p-8 text-center ${theme.card}`}>
          <p className={`text-sm ${theme.muted}`}>
            No plugins yet. Click "+ New" to upload your first one.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className={`text-sm font-semibold uppercase tracking-[0.14em] ${theme.subtext}`}>
                  {category}
                </h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${theme.code} ${theme.muted}`}>
                  {items.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(p => (
                  <PluginNode
                    key={p.id}
                    plugin={p}
                    theme={theme}
                    bunnyAvailable={bunnyAvailable}
                    onEdit={() => { setEditing(p); setFormOpen(true) }}
                    onDelete={handleDelete}
                    onUploadVersion={handleUploadVersion}
                    onDeleteVersion={handleDeleteVersion}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}