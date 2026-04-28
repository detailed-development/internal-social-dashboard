import { useState } from 'react'
import { generateImagePrompt, checkAiGeneration } from '../../api'
import { useTheme } from '../../ThemeContext'
import AILoadingState from './AILoadingState'
import ConfirmGenerateModal from './ConfirmGenerateModal'

const PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'Website', 'General']
const FORMATS = ['Square post', 'Portrait post', 'Story/Reel cover', 'Ad creative', 'Website hero', 'Thumbnail']
const STYLES = [
  'Neon Cactus branded',
  'Bold social graphic',
  'Clean product photo',
  'Editorial lifestyle photo',
  'Playful illustrated graphic',
  'Minimal web hero',
]

export default function ImagePromptGenerator() {
  const { theme } = useTheme()
  const [platform, setPlatform] = useState('Instagram')
  const [format, setFormat] = useState('Square post')
  const [subject, setSubject] = useState('')
  const [goal, setGoal] = useState('')
  const [style, setStyle] = useState('Neon Cactus branded')
  const [brandNotes, setBrandNotes] = useState('')
  const [mustInclude, setMustInclude] = useState('')
  const [mustAvoid, setMustAvoid] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmData, setConfirmData] = useState(null)
  const [confirmChecking, setConfirmChecking] = useState(false)
  const [pendingForceRefresh, setPendingForceRefresh] = useState(false)

  const inputParams = { platform, format, subject, goal, style, brandNotes, mustInclude, mustAvoid }

  async function openConfirm(forceRefresh = false) {
    if (subject.trim().length < 5) return
    setPendingForceRefresh(forceRefresh)
    setShowConfirm(true)
    setConfirmData(null)
    setConfirmChecking(true)
    try {
      const data = await checkAiGeneration({
        features: ['image-prompt-generator'],
        inputParams: { 'image-prompt-generator': inputParams },
      })
      setConfirmData(data)
    } catch {
      setConfirmData(null)
    } finally {
      setConfirmChecking(false)
    }
  }

  function handleConfirm() {
    setShowConfirm(false)
    handleGenerate(pendingForceRefresh)
  }

  async function handleGenerate(forceRefresh = false) {
    if (subject.trim().length < 5) return
    setLoading(true)
    setError(null)
    try {
      const data = await generateImagePrompt({ ...inputParams, forceRefresh })
      setResult(data)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to generate image prompt.')
    } finally {
      setLoading(false)
    }
  }

  function copyText(text, key) {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-xl p-5 ${theme.card}`}>
        <div className="mb-4 rounded-lg border border-lime-200 bg-lime-50 px-3 py-2 text-sm text-lime-900">
          Builds compact image prompts with Neon Cactus defaults: lime, fuchsia, warm yellow, deep charcoal, clean negative space, and no risky logo/likeness requests.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Platform</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)} className={`w-full text-sm rounded-lg px-3 py-1.5 ${theme.input}`}>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Format</label>
            <select value={format} onChange={e => setFormat(e.target.value)} className={`w-full text-sm rounded-lg px-3 py-1.5 ${theme.input}`}>
              {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Image subject</label>
          <textarea
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Example: a launch graphic for a new boutique fitness client package"
            rows={3}
            className={`w-full text-sm rounded-lg px-3 py-2 ${theme.input}`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Goal</label>
            <input
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="Awareness, promo, event, educational..."
              className={`w-full text-sm rounded-lg px-3 py-1.5 ${theme.input}`}
            />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Style</label>
            <select value={style} onChange={e => setStyle(e.target.value)} className={`w-full text-sm rounded-lg px-3 py-1.5 ${theme.input}`}>
              {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Client brand notes</label>
            <textarea value={brandNotes} onChange={e => setBrandNotes(e.target.value)} rows={2} placeholder="Optional colors, mood, audience..." className={`w-full text-sm rounded-lg px-3 py-2 ${theme.input}`} />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Must include</label>
            <textarea value={mustInclude} onChange={e => setMustInclude(e.target.value)} rows={2} placeholder="Objects, setting, product..." className={`w-full text-sm rounded-lg px-3 py-2 ${theme.input}`} />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Must avoid</label>
            <textarea value={mustAvoid} onChange={e => setMustAvoid(e.target.value)} rows={2} placeholder="No text, no people, no logos..." className={`w-full text-sm rounded-lg px-3 py-2 ${theme.input}`} />
          </div>
        </div>

        <button onClick={() => openConfirm(false)} disabled={loading || subject.trim().length < 5} className={`px-5 py-2 text-sm font-medium rounded-lg ${theme.btnPrimary}`}>
          {loading ? 'Generating...' : 'Generate Image Prompt'}
        </button>
      </div>

      <AILoadingState loading={loading} error={error} onRetry={() => handleGenerate(false)}>
        {result && (
          <div className={`rounded-xl p-5 ${theme.card}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-semibold ${theme.heading}`}>Image Prompt</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full ${result.cached ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {result.cached ? 'Cached' : 'Fresh'}
                </span>
                {result.usage?.totalTokens > 0 && <span className={theme.muted}>{result.usage.totalTokens} tokens</span>}
                <button onClick={() => openConfirm(true)} className="text-indigo-600 hover:text-indigo-800 font-medium">Regenerate</button>
              </div>
            </div>

            <div className={`rounded-lg p-4 mb-3 ${theme.id === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-semibold uppercase tracking-wide ${theme.subtext}`}>Prompt</p>
                <button onClick={() => copyText(result.prompt, 'prompt')} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                  {copied === 'prompt' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className={`text-sm whitespace-pre-wrap leading-relaxed ${theme.body}`}>{result.prompt}</p>
            </div>

            {result.negativePrompt && (
              <div className={`rounded-lg p-4 mb-3 ${theme.id === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${theme.subtext}`}>Negative prompt</p>
                  <button onClick={() => copyText(result.negativePrompt, 'negative')} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                    {copied === 'negative' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className={`text-sm ${theme.body}`}>{result.negativePrompt}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className={`rounded-lg p-3 ${theme.code}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${theme.subtext}`}>Recommended size</p>
                <p className={`mt-1 ${theme.body}`}>{result.size || 'Use platform default'}</p>
              </div>
              {result.usageNotes?.length > 0 && (
                <div className={`rounded-lg p-3 ${theme.code}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${theme.subtext}`}>Usage notes</p>
                  <ul className={`mt-1 list-disc list-inside ${theme.body}`}>
                    {result.usageNotes.map((note, i) => <li key={i}>{note}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </AILoadingState>

      <ConfirmGenerateModal
        open={showConfirm}
        checking={confirmChecking}
        data={confirmData}
        isRegenerate={pendingForceRefresh}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  )
}
