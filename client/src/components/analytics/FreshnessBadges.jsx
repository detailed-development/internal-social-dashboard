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

function getStatusTone(theme, state) {
  return theme.status?.[state] || theme.status?.unknown || {
    pill: 'bg-gray-100 text-gray-600 border border-gray-200',
    card: 'border-gray-200',
    dot: 'bg-gray-400',
    bar: 'bg-gray-400',
  }
}

function StatusPill({ state, theme }) {
  const tone = getStatusTone(theme, state)
  const label = state === 'unknown' ? 'Unknown' : state[0].toUpperCase() + state.slice(1)

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${tone.pill}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
      {label}
    </span>
  )
}

function Detail({ label, value, theme }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={`text-xs ${theme.subtext}`}>{label}</span>
      <span className={`text-sm font-medium text-right ${theme.body}`}>
        {value ? timeAgo(value) : 'No data'}
      </span>
    </div>
  )
}

function StatusCard({ title, primaryLabel, primaryValue, details = [], theme, className = '' }) {
  const state = primaryValue ? staleness(primaryValue) : 'unknown'
  const tone = getStatusTone(theme, state)

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${theme.card} ${tone.card} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${theme.subtext}`}>
            {title}
          </p>
          <p className={`mt-2 text-base font-semibold leading-tight ${theme.heading}`}>
            {primaryLabel}: {primaryValue ? timeAgo(primaryValue) : 'No data'}
          </p>
        </div>
        <StatusPill state={state} theme={theme} />
      </div>

      {details.length > 0 && (
        <div className={`mt-4 space-y-2 border-t pt-3 ${theme.dividerSoft || theme.cardDivider}`}>
          {details.map((detail) => (
            <Detail key={`${title}-${detail.label}`} label={detail.label} value={detail.value} theme={theme} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FreshnessBadges({ freshness }) {
  const { theme } = useTheme()
  if (!freshness) return null

  const socialContent = freshness.socialLastChangedAt ?? freshness.socialLastSyncedAt
  const socialMetrics = freshness.socialMetricsLastRefreshedAt ?? freshness.socialLastSyncedAt
  const socialChecked = freshness.socialLastSyncedAt
  const messagesChanged = freshness.messagesLastChangedAt ?? freshness.messagesLastSyncedAt
  const messagesChecked = freshness.messagesLastSyncedAt
  const webLatest = freshness.webAnalyticsLastChangedAt ?? freshness.webAnalyticsLastSyncedAt
  const transcriptionPct = freshness.transcriptionCoveragePct
  const transcriptionState =
    transcriptionPct == null ? 'unknown' : transcriptionPct >= 80 ? 'fresh' : transcriptionPct >= 40 ? 'aging' : 'stale'
  const transcriptionTone = getStatusTone(theme, transcriptionState)

  return (
    <div className="mb-4">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <h3 className={`text-sm font-semibold ${theme.heading}`}>Freshness Stats</h3>
          <p className={`text-xs ${theme.subtext}`}>
            Grouped by source activity, metric refreshes, and sync health.
          </p>
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

        <div className={`rounded-xl border p-4 shadow-sm ${theme.card} ${transcriptionTone.card} xl:col-span-2`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${theme.subtext}`}>
                Transcribed
              </p>
              <p className={`mt-2 text-base font-semibold leading-tight ${theme.heading}`}>
                {transcriptionPct == null ? 'No data' : `${transcriptionPct}% completed`}
              </p>
            </div>
            <StatusPill state={transcriptionState} theme={theme} />
          </div>

          {transcriptionPct != null && (
            <div className="mt-4">
              <div className={`h-2 rounded-full overflow-hidden ${theme.progressTrack || 'bg-gray-100'}`}>
                <div
                  className={`h-full rounded-full ${transcriptionTone.bar}`}
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
