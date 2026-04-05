import { useState } from 'react'
import { useTheme } from '../ThemeContext'
import PlatformBadge from './PlatformBadge'

function fmt(n) {
  if (!n) return '0'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

const MEDIA_LABELS = { REEL: 'Reel', VIDEO: 'Video', SHORT: 'Short' }

export default function PostCard({ post, platform }) {
  const { theme } = useTheme()
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const m = post.metrics?.[0]
  const mediaLabel = MEDIA_LABELS[post.mediaType]
  const hasTranscript = !!post.transcription?.transcriptText

  return (
    <div className={`border rounded-xl p-4 flex flex-col gap-3 ${theme.card}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlatformBadge platform={platform} />
          {mediaLabel && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${theme.mediaBadge}`}>
              {mediaLabel}
            </span>
          )}
        </div>
        <span className={`text-xs ${theme.muted}`}>
          {new Date(post.publishedAt).toLocaleDateString()}
        </span>
      </div>

      {post.caption && (
        <p className={`text-sm line-clamp-3 ${theme.body}`}>{post.caption}</p>
      )}

      {m && (
        <div className={`grid grid-cols-4 gap-2 pt-2 border-t ${theme.cardDivider}`}>
          {[
            { label: 'Likes',    value: fmt(m.likes) },
            { label: 'Comments', value: fmt(m.commentsCount) },
            { label: 'Shares',   value: fmt(m.shares) },
            { label: 'Saves',    value: fmt(m.saves) },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className={`text-sm font-semibold ${theme.heading}`}>{value}</p>
              <p className={`text-xs ${theme.muted}`}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {hasTranscript && (
        <div className={`pt-2 border-t ${theme.cardDivider}`}>
          <button
            type="button"
            onClick={() => setTranscriptOpen(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${theme.transcriptToggle}`}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>
            </svg>
            Transcript
            <svg
              className={`w-3 h-3 transition-transform flex-shrink-0 ${transcriptOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>

          {transcriptOpen && (
            <p className={`mt-2 text-xs leading-relaxed rounded-lg p-3 ${theme.transcriptPanel}`}>
              {post.transcription.transcriptText}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
