import { useState } from 'react'
import { generateCaption, checkAiGeneration } from '../../api'
import { useTheme } from '../../ThemeContext'
import AILoadingState from './AILoadingState'
import ConfirmGenerateModal from './ConfirmGenerateModal'

const PLATFORMS = ['Instagram', 'Facebook', 'Twitter', 'TikTok', 'YouTube', 'LinkedIn']
const TONES = ['casual', 'professional', 'playful', 'bold', 'inspirational', 'educational']
const LENGTHS = ['short', 'medium', 'long']

export default function CaptionGenerator() {
  const { theme } = useTheme()
  const [platform, setPlatform] = useState('Instagram')
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('casual')
  const [length, setLength] = useState('medium')
  const [hashtags, setHashtags] = useState(true)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmData, setConfirmData] = useState(null)
  const [confirmChecking, setConfirmChecking] = useState(false)
  const [pendingForceRefresh, setPendingForceRefresh] = useState(false)

  async function openConfirm(forceRefresh = false) {
    if (!topic.trim()) return
    setPendingForceRefresh(forceRefresh)
    setShowConfirm(true)
    setConfirmData(null)
    setConfirmChecking(true)
    try {
      const data = await checkAiGeneration({
        features: ['caption-generator'],
        inputParams: { 'caption-generator': { platform, topic, tone, length, hashtags } },
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
    if (!topic.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await generateCaption({ platform, topic, tone, length, hashtags, forceRefresh })
      setResult(data)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to generate captions.')
    } finally {
      setLoading(false)
    }
  }

  function copyText(text, idx) {
    navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-xl p-5 ${theme.card}`}>
        {/* Platform pills */}
        <div className="mb-4">
          <label className={`block text-xs font-medium mb-2 ${theme.muted}`}>Platform</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  platform === p
                    ? 'bg-indigo-600 text-white'
                    : theme.id === 'dark' ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Topic */}
        <div className="mb-4">
          <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Topic / Prompt</label>
          <textarea
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="What should the caption be about?"
            rows={3}
            className={`w-full text-sm rounded-lg px-3 py-2 ${theme.input}`}
          />
        </div>

        {/* Tone + Length + Hashtags */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Tone</label>
            <select value={tone} onChange={e => setTone(e.target.value)} className={`text-sm rounded-lg px-3 py-1.5 ${theme.input}`}>
              {TONES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Length</label>
            <div className="flex gap-1">
              {LENGTHS.map(l => (
                <button
                  key={l}
                  onClick={() => setLength(l)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    length === l
                      ? 'bg-indigo-600 text-white'
                      : theme.id === 'dark' ? 'bg-gray-600 text-gray-200' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={hashtags} onChange={e => setHashtags(e.target.checked)} className="rounded" />
              <span className={theme.muted}>Include hashtags</span>
            </label>
          </div>
        </div>

        <button onClick={() => openConfirm(false)} disabled={loading || !topic.trim()} className={`px-5 py-2 text-sm font-medium rounded-lg ${theme.btnPrimary}`}>
          {loading ? 'Generating...' : 'Generate Captions'}
        </button>
      </div>

      <AILoadingState loading={loading} error={error} onRetry={() => handleGenerate(false)}>
        {result && (
          <div className={`rounded-xl p-5 ${theme.card}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-semibold ${theme.heading}`}>Generated Captions</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full ${result.cached ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {result.cached ? 'Cached' : 'Fresh'}
                </span>
                {result.usage?.totalTokens > 0 && (
                  <span className={theme.muted}>{result.usage.totalTokens} tokens</span>
                )}
                <button onClick={() => openConfirm(true)} className="text-indigo-600 hover:text-indigo-800 font-medium">
                  Regenerate
                </button>
              </div>
            </div>
            <div className={`prose prose-sm max-w-none ${theme.id === 'dark' ? 'prose-invert' : ''}`}>
              {result.captions.split(/####\s+Caption\s+\d+/i).filter(Boolean).map((caption, i) => (
                <div key={i} className={`p-3 rounded-lg mb-3 ${theme.id === 'dark' ? 'bg-gray-600' : 'bg-gray-50'}`}>
                  <p className={`text-sm whitespace-pre-wrap ${theme.heading}`}>{caption.trim()}</p>
                  <button
                    onClick={() => copyText(caption.trim(), i)}
                    className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {copied === i ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              ))}
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
