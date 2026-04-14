import { useTheme } from '../../ThemeContext'

function timeAgo(isoString) {
  if (!isoString) return null
  const ms = Date.now() - new Date(isoString).getTime()
  const hours = Math.floor(ms / 3.6e6)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}hr ago`
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

const CARD_STYLES = {
  fresh:   'border-emerald-200',
  aging:   'border-amber-200',
  stale:   'border-red-200',
  unknown: 'border-gray-200',
}

function StatusPill({ state }) {
  const label = state === 'unknown' ? 'Unknown' : state[0].toUpperCase() + state.slice(1)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${BADGE_STYLES[state]}`}>
      {label}
    </span>
  )
}

function Detail({ label, value, theme }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`text-[11px] ${theme.subtext}`}>{label}:</span>
      <span className={`text-[11px] font-medium ${theme.body}`}>{value ? timeAgo(value) : 'No data'}</span>
    </div>
  )
}

function StatusCard({ title, primaryLabel, primaryValue, details = [], theme, className = '' }) {
  const state = primaryValue ? staleness(primaryValue) : 'unknown'
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${theme.card} ${CARD_STYLES[state]} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${theme.subtext}`}>{title}</p>
          <p className={`mt-1 text-sm font-semibold ${theme.heading}`}>
            {primaryLabel}: {primaryValue ? timeAgo(primaryValue) : 'No data'}
          </p>
        </div>
        <StatusPill state={state} />
      </div>
      {details.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-black/5 pt-3">
          {details.map((detail) => (
            <Detail key={`${title}-${detail.label}`} label={detail.label} value={detail.value} theme={theme} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FreshnessBadges({ freshness }) {
  if (!freshness) return null
  const theme = useTheme()

  const socialContent = freshness.socialLastChangedAt ?? freshness.socialLastSyncedAt
  const socialMetrics = freshness.socialMetricsLastRefreshedAt ?? freshness.socialLastSyncedAt
  const socialChecked = freshness.socialLastSyncedAt
  const messagesChanged = freshness.messagesLastChangedAt ?? freshness.messagesLastSyncedAt
  const messagesChecked = freshness.messagesLastSyncedAt
  const webLatest = freshness.webAnalyticsLastChangedAt ?? freshness.webAnalyticsLastSyncedAt
  const transcriptionPct = freshness.transcriptionCoveragePct
  const transcriptionState =
    transcriptionPct == null ? 'unknown' : transcriptionPct >= 80 ? 'fresh' : transcriptionPct >= 40 ? 'aging' : 'stale'

  return (
    <div className="mb-4">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <h3 className={`text-sm font-semibold ${theme.heading}`}>Freshness Stats</h3>
          <p className={`text-[11px] ${theme.subtext}`}>Grouped by source activity, metric refreshes, and sync health.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
        <StatusCard
          title="Social"
          primaryLabel="Content checked"
          primaryValue={socialChecked}
          details={[
            { label: 'New content', value: socialContent },
            { label: 'Metrics updated', value: socialMetrics },
          ]}
          theme={theme}
          className="xl:col-span-4"
        />
        <StatusCard
          title="Messages"
          primaryLabel="Checked"
          primaryValue={messagesChecked}
          details={[
            { label: 'Last message received', value: messagesChanged },
          ]}
          theme={theme}
          className="xl:col-span-4"
        />
        <StatusCard
          title="Website Metrics"
          primaryLabel="Last updated"
          primaryValue={webLatest}
          theme={theme}
          className="xl:col-span-2"
        />
        <div className={`rounded-xl border p-4 shadow-sm ${theme.card} ${CARD_STYLES[transcriptionState]} xl:col-span-2`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${theme.subtext}`}>Transcribed</p>
              <p className={`mt-1 text-sm font-semibold ${theme.heading}`}>
                {transcriptionPct == null ? 'No data' : `${transcriptionPct}% completed`}
              </p>
            </div>
            <StatusPill state={transcriptionState} />
          </div>
          {transcriptionPct != null && (
            <div className="mt-3">
              <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${transcriptionPct >= 80 ? 'bg-emerald-500' : transcriptionPct >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.max(0, Math.min(100, transcriptionPct))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
