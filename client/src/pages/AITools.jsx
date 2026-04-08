import { useState } from 'react'
import { useTheme } from '../ThemeContext'
import CaptionGenerator from '../components/ai/CaptionGenerator'
import HashtagExtractor from '../components/ai/HashtagExtractor'
import ContentRewriter from '../components/ai/ContentRewriter'
import ReportDraftGenerator from '../components/ai/ReportDraftGenerator'

const TABS = ['Captions', 'Hashtags', 'Rewriter', 'Report Draft']

export default function AITools() {
  const { theme } = useTheme()
  const [tab, setTab] = useState('Captions')

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <h2 className={`text-2xl font-bold mb-1 ${theme.heading}`}>AI Tools</h2>
      <p className={`text-sm mb-6 ${theme.muted}`}>Generate content, extract insights, and rewrite copy with AI.</p>

      {/* Tab bar */}
      <div className={`flex gap-1 mb-6 p-1 rounded-lg overflow-x-auto ${theme.id === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === t
                ? theme.id === 'dark' ? 'bg-gray-500 text-white' : 'bg-white text-gray-900 shadow-sm'
                : theme.id === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Captions' && <CaptionGenerator />}
      {tab === 'Hashtags' && <HashtagExtractor />}
      {tab === 'Rewriter' && <ContentRewriter />}
      {tab === 'Report Draft' && <ReportDraftGenerator />}
    </div>
  )
}
