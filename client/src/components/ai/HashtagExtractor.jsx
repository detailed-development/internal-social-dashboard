import { useState } from 'react'
import { extractHashtags } from '../../api'
import { useTheme } from '../../ThemeContext'
import AILoadingState from './AILoadingState'

export default function HashtagExtractor() {
  const { theme } = useTheme()
  const [text, setText] = useState('')
  const [platform, setPlatform] = useState('general')
  const [maxTags, setMaxTags] = useState(20)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  async function handleExtract(forceRefresh = false) {
    if (text.length < 10) return
    setLoading(true)
    setError(null)
    try {
      const data = await extractHashtags({ text, platform, maxTags, forceRefresh })
      setResult(data)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to extract hashtags.')
    } finally {
      setLoading(false)
    }
  }

  function copyAll() {
    if (!result?.hashtags) return
    navigator.clipboard.writeText(result.hashtags.join(' '))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-xl p-5 ${theme.card}`}>
        <div className="mb-4">
          <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Text to analyze</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste your post text, caption, or any content to extract hashtags and keywords..."
            rows={4}
            className={`w-full text-sm rounded-lg px-3 py-2 ${theme.input}`}
          />
        </div>

        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Platform</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)} className={`text-sm rounded-lg px-3 py-1.5 ${theme.input}`}>
              {['general', 'instagram', 'facebook', 'twitter', 'tiktok', 'linkedin'].map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>Max hashtags</label>
            <input
              type="number"
              value={maxTags}
              onChange={e => setMaxTags(parseInt(e.target.value) || 20)}
              min={5}
              max={30}
              className={`w-20 text-sm rounded-lg px-3 py-1.5 ${theme.input}`}
            />
          </div>
        </div>

        <button onClick={() => handleExtract(false)} disabled={loading || text.length < 10} className={`px-5 py-2 text-sm font-medium rounded-lg ${theme.btnPrimary}`}>
          {loading ? 'Extracting...' : 'Extract Hashtags'}
        </button>
      </div>

      <AILoadingState loading={loading} error={error} onRetry={() => handleExtract(false)}>
        {result && (
          <div className={`rounded-xl p-5 ${theme.card}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold ${theme.heading}`}>Results</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full ${result.cached ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {result.cached ? 'Cached' : 'Fresh'}
                </span>
                <button onClick={() => handleExtract(true)} className="text-indigo-600 hover:text-indigo-800 font-medium">
                  Regenerate
                </button>
              </div>
            </div>

            {/* Hashtags */}
            {result.hashtags?.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className={`text-sm font-medium ${theme.heading}`}>Hashtags</h4>
                  <button onClick={copyAll} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                    {copied ? 'Copied!' : 'Copy All'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.hashtags.map((tag, i) => (
                    <span key={i} className={`px-2 py-1 text-sm rounded-full ${theme.id === 'dark' ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-50 text-indigo-700'}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords */}
            {result.keywords?.length > 0 && (
              <div className="mb-4">
                <h4 className={`text-sm font-medium mb-2 ${theme.heading}`}>Keywords</h4>
                <p className={`text-sm ${theme.muted}`}>{result.keywords.join(', ')}</p>
              </div>
            )}

            {/* Categories */}
            {result.categories?.length > 0 && (
              <div>
                <h4 className={`text-sm font-medium mb-2 ${theme.heading}`}>Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {result.categories.map((cat, i) => (
                    <span key={i} className={`px-2 py-1 text-xs rounded-lg font-medium ${theme.id === 'dark' ? 'bg-gray-600 text-gray-200' : 'bg-gray-100 text-gray-600'}`}>
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </AILoadingState>
    </div>
  )
}
