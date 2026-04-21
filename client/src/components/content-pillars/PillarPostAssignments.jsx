import { useTheme } from '../../ThemeContext'
import PlatformBadge from '../PlatformBadge'

function PillarPostRow({ post, isAssigned, disabled, onToggle }) {
  const { theme } = useTheme()
  const assignedRowClass = theme.id === 'dark'
    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200'
    : 'bg-indigo-50 border border-indigo-200 text-indigo-800'
  const assignedDotClass = theme.id === 'dark'
    ? 'bg-emerald-400 border-emerald-400'
    : 'bg-indigo-500 border-indigo-500'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(post.id, isAssigned)}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
        isAssigned
          ? assignedRowClass
          : `${theme.code} ${theme.body} border border-transparent`
      }`}
    >
      <span
        className={`w-3 h-3 rounded flex-shrink-0 border-2 ${
          isAssigned ? assignedDotClass : 'border-gray-300'
        }`}
      />

      {post.platform && (
        <span className="flex-shrink-0">
          <PlatformBadge platform={post.platform} />
        </span>
      )}

      <span className="truncate flex-1">
        {post.caption?.slice(0, 80) || `Post ${post.id.slice(0, 8)}`}
      </span>

      <span className={theme.muted}>{new Date(post.publishedAt).toLocaleDateString()}</span>
    </button>
  )
}

export default function PillarPostAssignments({
  posts,
  selectedPillarId,
  activePillarName,
  assigningPostId,
  onToggleAssignment,
}) {
  const { theme } = useTheme()

  if (!selectedPillarId || posts.length === 0) {
    return null
  }

  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-[0.14em] mb-2 ${theme.subtext}`}>
        Toggle posts for &quot;{activePillarName}&quot;
      </p>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {posts.map((post) => {
          const isAssigned = post.pillars?.some(
            (assignment) => assignment.contentPillarId === selectedPillarId
          )

          return (
            <PillarPostRow
              key={post.id}
              post={post}
              isAssigned={isAssigned}
              disabled={assigningPostId === post.id}
              onToggle={(postId, assigned) => onToggleAssignment({
                pillarId: selectedPillarId,
                postId,
                isAssigned: assigned,
              })}
            />
          )
        })}
      </div>
    </div>
  )
}
