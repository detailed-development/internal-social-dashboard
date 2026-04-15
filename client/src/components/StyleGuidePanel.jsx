import { useState, useEffect } from 'react'
import { getStyleGuide, updateStyleGuide } from '../api'
import { useTheme } from '../ThemeContext'

function buildPromptMarkdown({ fonts, primaryColors, secondaryColors, toneOfVoice, brandGuidelines, dos, donts }) {
  const lines = ['# Brand Style Guide']

  if (fonts) {
    lines.push('\n## Typography')
    lines.push(fonts)
  }

  const pcList = parseList(primaryColors)
  if (pcList.length > 0) {
    lines.push('\n## Primary Colors')
    pcList.forEach(c => lines.push(`- ${c}`))
  }

  const scList = parseList(secondaryColors)
  if (scList.length > 0) {
    lines.push('\n## Secondary Colors')
    scList.forEach(c => lines.push(`- ${c}`))
  }

  if (toneOfVoice) {
    lines.push('\n## Tone of Voice')
    lines.push(toneOfVoice)
  }

  if (brandGuidelines) {
    lines.push('\n## Brand Guidelines')
    lines.push(brandGuidelines)
  }

  const dosList = parseList(dos)
  if (dosList.length > 0) {
    lines.push('\n## Do\'s')
    dosList.forEach(d => lines.push(`- ${d}`))
  }

  const dontsList = parseList(donts)
  if (dontsList.length > 0) {
    lines.push('\n## Don\'ts')
    dontsList.forEach(d => lines.push(`- ${d}`))
  }

  return lines.join('\n')
}

function parseList(val) {
  if (!val) return []
  if (Array.isArray(val)) return val.filter(Boolean)
  return String(val).split('\n').map(s => s.trim()).filter(Boolean)
}

function listToString(val) {
  if (!val) return ''
  if (Array.isArray(val)) return val.join('\n')
  return String(val)
}

function MarkdownPreview({ markdown, theme }) {
  if (!markdown) {
    return <p className={`text-sm italic ${theme.muted}`}>Fill in the form to see the preview.</p>
  }
  return (
    <pre className={`text-xs leading-relaxed whitespace-pre-wrap font-mono ${theme.body}`}>
      {markdown}
    </pre>
  )
}

export default function StyleGuidePanel({ clientSlug }) {
  const { theme } = useTheme()

  const [fonts, setFonts] = useState('')
  const [primaryColors, setPrimaryColors] = useState('')
  const [secondaryColors, setSecondaryColors] = useState('')
  const [toneOfVoice, setToneOfVoice] = useState('')
  const [brandGuidelines, setBrandGuidelines] = useState('')
  const [dos, setDos] = useState('')
  const [donts, setDonts] = useState('')
  const [promptMarkdown, setPromptMarkdown] = useState('')
  const [manualOverride, setManualOverride] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!clientSlug) return
    setLoading(true)
    getStyleGuide(clientSlug)
      .then(guide => {
        if (guide) {
          setFonts(guide.fonts || '')
          setPrimaryColors(listToString(guide.primaryColors))
          setSecondaryColors(listToString(guide.secondaryColors))
          setToneOfVoice(guide.toneOfVoice || '')
          setBrandGuidelines(guide.brandGuidelines || '')
          setDos(listToString(guide.dos))
          setDonts(listToString(guide.donts))
          if (guide.promptMarkdown) {
            setPromptMarkdown(guide.promptMarkdown)
            // If the saved markdown doesn't match what auto-gen would produce, treat as manual override
            const auto = buildPromptMarkdown({
              fonts: guide.fonts,
              primaryColors: guide.primaryColors,
              secondaryColors: guide.secondaryColors,
              toneOfVoice: guide.toneOfVoice,
              brandGuidelines: guide.brandGuidelines,
              dos: guide.dos,
              donts: guide.donts,
            })
            setManualOverride(guide.promptMarkdown.trim() !== auto.trim())
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientSlug])

  // Auto-update prompt markdown when form fields change (unless manual override)
  useEffect(() => {
    if (manualOverride) return
    setPromptMarkdown(buildPromptMarkdown({ fonts, primaryColors, secondaryColors, toneOfVoice, brandGuidelines, dos, donts }))
  }, [fonts, primaryColors, secondaryColors, toneOfVoice, brandGuidelines, dos, donts, manualOverride])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await updateStyleGuide(clientSlug, {
        fonts: fonts || null,
        primaryColors: parseList(primaryColors),
        secondaryColors: parseList(secondaryColors),
        toneOfVoice: toneOfVoice || null,
        brandGuidelines: brandGuidelines || null,
        dos: parseList(dos),
        donts: parseList(donts),
        promptMarkdown: promptMarkdown || null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleDownload() {
    if (!promptMarkdown) return
    const blob = new Blob([promptMarkdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${clientSlug}-style-guide.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleCopy() {
    if (!promptMarkdown) return
    navigator.clipboard.writeText(promptMarkdown)
  }

  if (loading) {
    return <p className={`text-sm ${theme.muted} p-4`}>Loading style guide…</p>
  }

  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${theme.input}`
  const textareaClass = `${inputClass} resize-y`
  const labelClass = `block text-xs font-medium mb-1 ${theme.muted}`

  return (
    <form onSubmit={handleSave}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: structured form */}
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Fonts</label>
            <input
              type="text"
              value={fonts}
              onChange={e => setFonts(e.target.value)}
              placeholder="e.g. Heading: Playfair Display, Body: Inter"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Primary Colors (one per line)</label>
            <textarea
              value={primaryColors}
              onChange={e => setPrimaryColors(e.target.value)}
              placeholder="#FF5733&#10;#C70039"
              rows={3}
              className={textareaClass}
            />
          </div>

          <div>
            <label className={labelClass}>Secondary Colors (one per line)</label>
            <textarea
              value={secondaryColors}
              onChange={e => setSecondaryColors(e.target.value)}
              placeholder="#900C3F&#10;#581845"
              rows={3}
              className={textareaClass}
            />
          </div>

          <div>
            <label className={labelClass}>Tone of Voice</label>
            <textarea
              value={toneOfVoice}
              onChange={e => setToneOfVoice(e.target.value)}
              placeholder="Professional yet approachable. Avoid jargon. Speak directly to the community."
              rows={3}
              className={textareaClass}
            />
          </div>

          <div>
            <label className={labelClass}>Brand Guidelines</label>
            <textarea
              value={brandGuidelines}
              onChange={e => setBrandGuidelines(e.target.value)}
              placeholder="Always lead with the mission. Keep captions under 150 words for feed posts."
              rows={4}
              className={textareaClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Do's (one per line)</label>
              <textarea
                value={dos}
                onChange={e => setDos(e.target.value)}
                placeholder="Use authentic photography&#10;Feature real clients"
                rows={4}
                className={textareaClass}
              />
            </div>
            <div>
              <label className={labelClass}>Don'ts (one per line)</label>
              <textarea
                value={donts}
                onChange={e => setDonts(e.target.value)}
                placeholder="Stock imagery&#10;Competitor mentions"
                rows={4}
                className={textareaClass}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${theme.btnPrimary}`}
            >
              {saving ? 'Saving…' : 'Save Style Guide'}
            </button>
            {saved && <span className="text-sm text-green-600 font-medium">Saved</span>}
            {error && <span className="text-sm text-red-500">{error}</span>}
          </div>
        </div>

        {/* Right: prompt markdown preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className={`text-xs font-semibold uppercase tracking-wide ${theme.subtext}`}>Prompt Markdown</p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualOverride}
                  onChange={e => setManualOverride(e.target.checked)}
                  className="rounded"
                />
                <span className={`text-xs ${theme.muted}`}>Manual edit</span>
              </label>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!promptMarkdown}
                className={`text-xs font-medium ${theme.muted} hover:opacity-80 disabled:opacity-40`}
              >
                Copy
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!promptMarkdown}
                className={`text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-40`}
              >
                Download .md
              </button>
            </div>
          </div>

          {manualOverride ? (
            <textarea
              value={promptMarkdown}
              onChange={e => setPromptMarkdown(e.target.value)}
              rows={28}
              className={`${textareaClass} font-mono text-xs`}
            />
          ) : (
            <div className={`rounded-xl border p-4 min-h-[300px] ${theme.card}`}>
              <MarkdownPreview markdown={promptMarkdown} theme={theme} />
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
