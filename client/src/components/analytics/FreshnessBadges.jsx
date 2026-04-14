import { useTheme } from '../../ThemeContext'

function timeAgo(isoString) {
  if (!isoString) return null
  const ms = Date.now() - new Date(isoString).getTime()
  const hours = Math.floor(ms / 3.6e6)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function staleness(isoString) {
  if (!isoString) return 'unknown'
  const hours = (Date.now() - new Date(isoString).getTime()) / 3.6e6
  if (hours > 72) return 'stale'
  if (hours > 24) return 'aging'
  return 'fresh'
}

const BADGE_STYLES = {
  fresh:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  aging:   'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  stale:   'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  unknown: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

function Badge({ label, value }) {
  const state = value ? staleness(value) : 'unknown'
  const display = value ? timeAgo(value) : 'no data'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${BADGE_STYLES[state]}`}>
      {label}: {display}
    </span>
  )
}

export default function FreshnessBadges({ freshness }) {
  if (!freshness) return null
  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      <Badge label="Social" value={freshness.socialLastSyncedAt} />
      <Badge label="Messages" value={freshness.messagesLastSyncedAt} />
      <Badge label="Web" value={freshness.webAnalyticsLastSyncedAt} />
      {freshness.transcriptionCoveragePct != null && (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
          freshness.transcriptionCoveragePct >= 80
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
        }`}>
          Transcribed: {freshness.transcriptionCoveragePct}%
        </span>
      )}
    </div>
  )
}
