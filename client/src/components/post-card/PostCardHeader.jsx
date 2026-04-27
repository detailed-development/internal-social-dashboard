import { useTheme } from '../../ThemeContext'
import PlatformBadge from '../PlatformBadge'

function formatPublishedAt(value) {
  if (!value) return ''
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function PostCardHeader({ platform, mediaLabel, publishedAt }) {
  const { theme } = useTheme()

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <PlatformBadge platform={platform} />
        {mediaLabel && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${theme.mediaBadge}`}>
            {mediaLabel}
          </span>
        )}
      </div>

      <span className={`text-xs text-right ${theme.muted}`}>
        {formatPublishedAt(publishedAt)}
      </span>
    </div>
  )
}
