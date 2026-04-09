import { useState } from 'react'
import { rewriteContent, checkAiGeneration } from '../../api'
import { useTheme } from '../../ThemeContext'
import AILoadingState from './AILoadingState'
import ConfirmGenerateModal from './ConfirmGenerateModal'

const TONES = [
  'professional', 'casual', 'concise', 'persuasive', 'polished',
  'client-facing', 'playful', 'bold', 'educational', 'empathetic',
]

export default function ContentRewriter() {
  const { theme } = useTheme()
  const [text, setText] = useState('')
  const [targetTone, setTargetTone] = useState('professional')
  const [platform, setPlatform] = useState('general')
  const [maxLength, setMaxLength] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmData, setConfirmData] = useState(null)
  const [confirmChecking, setConfirmChecking] = useState(false)
  const [pendingForceRefresh, setPendingForceRefresh] = useState(false)

  async function openConfirm(forceRefresh = false) {
    if (text.length < 10) return
    setPendingForceRefresh(forceRefresh)
    setShowConfirm(true)
    setConfirmData(null)
    setConfirmChecking(true)
    try {
      const data = await checkAiGeneration({
        features: ['content-rewriter'],
        inputParams: {
          'content-rewriter': {
            text,
            targetTone,
            platform,
            maxLength: maxLength ? parseInt(maxLength) : '',
          },
        },
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
    handleRewrite(pendingForceRefresh)
  }

  async function handleRewrite(forceRefresh = false) {
    if (text.length < 10) return
    setLoading(true)
    setError(null)
    try {
      const data = await rewriteContent({
        text,
        targetTone,
        platform,
        maxLength: maxLength ? parseInt(maxLength) : undefined,
        forceRefresh,
      })
      setResult(data)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to rewrite content.')
    } finally {
      setLoading(false)
    }
  }

  function copyResult() {
    if (!result?.result) return
    navigator.clipboard.writeText(result.result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-xl p-5 ${theme.card}`}>
        <div className="mb-4">
          <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Original Text</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste the content you want to rewrite..."
            rows={5}
            className={`w-full text-sm rounded-lg px-3 py-2 ${theme.input}`}
          />
        </div>

        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Target Tone</label>
            <select value={targetTone} onChange={e => setTargetTone(e.target.value)} className={`text-sm rounded-lg px-3 py-1.5 ${theme.input}`}>
              {TONES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Platform</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)} className={`text-sm rounded-lg px-3 py-1.5 ${theme.input}`}>
              {['general', 'instagram', 'facebook', 'twitter', 'tiktok', 'linkedin', 'email'].map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Max Length (optional)</label>
            <input
              type="number"
              value={maxLength}
              onChange={e => setMaxLength(e.target.value)}
              placeholder="chars"
              className={`w-24 text-sm rounded-lg px-3 py-1.5 ${theme.input}`}
            />
          </div>
        </div>

        <button onClick={() => openConfirm(false)} disabled={loading || text.length < 10} className={`px-5 py-2 text-sm font-medium rounded-lg ${theme.btnPrimary}`}>
          {loading ? 'Rewriting...' : 'Rewrite'}
        </button>
      </div>

      <AILoadingState loading={loading} error={error} onRetry={() => handleRewrite(false)}>
        {result && (
          <div className={`rounded-xl p-5 ${theme.card}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-semibold ${theme.heading}`}>Rewritten Content</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full ${result.cached ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {result.cached ? 'Cached' : 'Fresh'}
                </span>
                {result.usage?.totalTokens > 0 && (
                  <span className={theme.muted}>{result.usage.totalTokens} tokens</span>
                )}
                <button onClick={copyResult} className="text-indigo-600 hover:text-indigo-800 font-medium">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={() => openConfirm(true)} className="text-indigo-600 hover:text-indigo-800 font-medium">
                  Regenerate
                </button>
              </div>
            </div>
            <div className={`prose prose-sm max-w-none ${theme.id === 'dark' ? 'prose-invert' : ''}`}>
              <div dangerouslySetInnerHTML={{ __html: markdownToHtml(result.result) }} />
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

function markdownToHtml(md) {
  if (!md) return ''
  return md
    .replace(/### (.+)/g, '<h4 class="font-semibold mt-4 mb-1">$1</h4>')
    .replace(/## (.+)/g, '<h3 class="font-bold mt-5 mb-2 text-base">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)/gm, '<li class="ml-4">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc mb-2">$&</ul>')
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}
