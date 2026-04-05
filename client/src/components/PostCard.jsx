import { useTheme } from '../ThemeContext'
import PlatformBadge from './PlatformBadge'

function fmt(n) {
  if (!n) return '0'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

export default function PostCard({ post, platform }) {
  const { theme } = useTheme()
  const m = post.metrics?.[0]
  return (
    <div className={`border rounded-xl p-4 flex flex-col gap-3 ${theme.card}`}>
      <div className="flex items-center justify-between">
        <PlatformBadge platform={platform} />
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
            { label: 'Likes',     value: fmt(m.likes) },
            { label: 'Comments',  value: fmt(m.commentsCount) },
            { label: 'Shares',    value: fmt(m.shares) },
            { label: 'Saves',     value: fmt(m.saves) },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className={`text-sm font-semibold ${theme.heading}`}>{value}</p>
              <p className={`text-xs ${theme.muted}`}>{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
