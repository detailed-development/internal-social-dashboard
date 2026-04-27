import { useState } from 'react'
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

function skeletonTone(theme) {
  return theme.id === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
}

function FreshnessSkeleton({ variant, theme }) {
  if (variant === 'compact') {
    return (
      <div className="relative mb-4 min-h-[28px]">
        <div className="flex items-center gap-2 flex-wrap">
          {['Social', 'Messages', 'Website', 'Transcribed'].map((label) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${theme.id === 'dark' ? 'border-gray-700 bg-gray-800 text-gray-500' : 'border-gray-200 bg-gray-50 text-gray-400'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${skeletonTone(theme)}`} />
              {label}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4 min-h-[156px]">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <h3 className={`text-sm font-semibold ${theme.heading}`}>Freshness Stats</h3>
          <p className={`text-xs ${theme.subtext}`}>Loading source freshness...</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
        {[4, 4, 2, 2].map((span, index) => (
          <div key={index} className={`rounded-xl border p-4 shadow-sm ${theme.card} ${theme.id === 'dark' ? 'border-gray-700' : 'border-gray-200'} xl:col-span-${span}`}>
            <div className={`h-3 rounded w-24 animate-pulse ${skeletonTone(theme)}`} />
            <div className={`mt-3 h-5 rounded w-36 animate-pulse ${skeletonTone(theme)}`} />
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusPill({ state, theme }) {
  const tone = getStatusTone(theme, state)
  const label = state === 'unknown' ? 'Unknown' : state[0].toUpperCase() + state.slice(1)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${tone.pill}`}>
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
          <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${theme.subtext}`}>{title}</p>
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

function CompactPill({ label, value, state, theme }) {
  const tone = getStatusTone(theme, state)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${tone.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tone.dot}`} />
      {label}{value ? ` · ${value}` : ''}
    </span>
  )
}

// Wraps a CompactPill with its own hover card — each pill shows a unique
// panel relevant only to that domain, rather than the full freshness grid.
function PillWithCard({ label, value, state, theme, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <CompactPill label={label} value={value} state={state} theme={theme} />
      {open && (
        <div
          className={`absolute top-full left-0 mt-1 z-40 rounded-xl border shadow-xl p-4 ${theme.card}`}
          style={{ width: 'min(360px, calc(100vw - 2rem))' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export default function FreshnessBadges({ freshness, variant = 'full' }) {
  const { theme } = useTheme()

  if (!freshness) return <FreshnessSkeleton variant={variant} theme={theme} />

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

  if (variant === 'compact') {
    return (
      <div className="relative mb-4 min-h-[28px]">
        <div className="flex items-center gap-2 flex-wrap cursor-default">
          <PillWithCard
            label="Social"
            value={socialChecked ? timeAgo(socialChecked) : null}
            state={socialChecked ? staleness(socialChecked) : 'unknown'}
            theme={theme}
          >
            <StatusCard
              title="Social"
              primaryLabel="Content checked"
              primaryValue={socialChecked}
              details={[
                { label: 'New content', value: socialContent },
                { label: 'Metrics updated', value: socialMetrics },
              ]}
              theme={theme}
            />
          </PillWithCard>
          <PillWithCard
            label="Messages"
            value={messagesChecked ? timeAgo(messagesChecked) : null}
            state={messagesChecked ? staleness(messagesChecked) : 'unknown'}
            theme={theme}
          >
            <StatusCard
              title="Messages"
              primaryLabel="Checked"
              primaryValue={messagesChecked}
              details={[{ label: 'Last message received', value: messagesChanged }]}
              theme={theme}
            />
          </PillWithCard>
          <PillWithCard
            label="Website"
            value={webLatest ? timeAgo(webLatest) : null}
            state={webLatest ? staleness(webLatest) : 'unknown'}
            theme={theme}
          >
            <StatusCard
              title="Website Metrics"
              primaryLabel="Last updated"
              primaryValue={webLatest}
              theme={theme}
            />
          </PillWithCard>
          <PillWithCard
            label="Transcribed"
            value={transcriptionPct != null ? `${transcriptionPct}%` : null}
            state={transcriptionState}
            theme={theme}
          >
            <div className={`rounded-xl border p-4 shadow-sm ${theme.card} ${transcriptionTone.card}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${theme.subtext}`}>Transcribed</p>
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
          </PillWithCard>
        </div>
      </div>
    )
  }

  // Full variant (kept for backwards compatibility, no longer used in Social tab)
  return (
    <div className="mb-4 min-h-[156px]">
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
          details={[{ label: 'Last message received', value: messagesChanged }]}
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
              <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${theme.subtext}`}>Transcribed</p>
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
