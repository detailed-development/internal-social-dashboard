import { useState } from 'react'
import { useTheme } from '../ThemeContext'
import PostCardHeader from './post-card/PostCardHeader'
import PostMetricsGrid from './post-card/PostMetricsGrid'
import PostTranscript from './post-card/PostTranscript'

const MEDIA_LABELS = {
  CAROUSEL: 'Carousel',
  REEL: 'Reel',
  VIDEO: 'Video',
  SHORT: 'Short',
}

export default function PostCard({ post, platform }) {
  const { theme } = useTheme()
  const [transcriptOpen, setTranscriptOpen] = useState(false)

  return (
    <div className={`border rounded-xl p-4 flex flex-col gap-3 ${theme.card}`}>
      <PostCardHeader
        platform={platform}
        mediaLabel={MEDIA_LABELS[post.mediaType]}
        publishedAt={post.publishedAt}
      />

      {post.caption && (
        <p className={`text-sm line-clamp-3 ${theme.body}`}>{post.caption}</p>
      )}

      <PostMetricsGrid metrics={post.metrics?.[0]} />

      <PostTranscript
        isOpen={transcriptOpen}
        onToggle={() => setTranscriptOpen((current) => !current)}
        text={post.transcription?.transcriptText}
      />
    </div>
  )
}
