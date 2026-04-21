import { useTheme } from '../../ThemeContext'
import PlatformBadge from '../PlatformBadge'

export default function PostCardHeader({ platform, mediaLabel, publishedAt }) {
  const { theme } = useTheme()

  return (
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
        {new Date(publishedAt).toLocaleDateString()}
      </span>
    </div>
  )
}
