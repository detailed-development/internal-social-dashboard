import PlatformBadge from './PlatformBadge'

function fmt(n) {
  if (!n) return '0'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

export default function PostCard({ post, platform }) {
  const m = post.metrics?.[0]
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <PlatformBadge platform={platform} />
        <span className="text-xs text-gray-400">
          {new Date(post.publishedAt).toLocaleDateString()}
        </span>
      </div>

      {post.caption && (
        <p className="text-sm text-gray-700 line-clamp-3">{post.caption}</p>
      )}

      {m && (
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100">
          {[
            { label: 'Likes',     value: fmt(m.likes) },
            { label: 'Comments',  value: fmt(m.commentsCount) },
            { label: 'Shares',    value: fmt(m.shares) },
            { label: 'Saves',     value: fmt(m.saves) },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-sm font-semibold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
