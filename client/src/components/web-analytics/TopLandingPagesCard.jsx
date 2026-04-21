import { useTheme } from '../../ThemeContext'

function formatNumber(value) {
  if (!value) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) return null
  return /^https?:\/\//i.test(baseUrl) ? baseUrl : `https://${baseUrl}`
}

function buildLandingPageUrl(baseUrl, pagePath) {
  if (!pagePath) return null
  if (/^https?:\/\//i.test(pagePath)) return pagePath

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
  if (!normalizedBaseUrl) return null

  try {
    return new URL(pagePath, normalizedBaseUrl).toString()
  } catch {
    return null
  }
}

function LandingPageRow({ page, baseUrl, theme, isLast }) {
  const pagePath = page.pagePath || page.path || '/'
  const landingPageUrl = buildLandingPageUrl(baseUrl, pagePath)
  const rowClassName = `flex flex-col items-start justify-between text-sm gap-2 py-2 sm:flex-row sm:items-center sm:gap-4 ${
    isLast ? '' : `border-b ${theme.cardDivider}`
  }`

  const content = (
    <>
      <span className={`truncate min-w-0 flex-1 font-mono text-xs ${landingPageUrl ? theme.detailsLink : theme.body}`}>
        {pagePath}
      </span>
      <div className="flex gap-4 flex-shrink-0">
        <span className={theme.muted}>{formatNumber(page.sessions)} sessions</span>
        <span className={theme.muted}>{formatNumber(page.pageviews)} views</span>
      </div>
    </>
  )

  if (!landingPageUrl) {
    return <div className={rowClassName}>{content}</div>
  }

  return (
    <a
      href={landingPageUrl}
      target="_blank"
      rel="noreferrer"
      className={`${rowClassName} hover:opacity-90`}
      title={landingPageUrl}
    >
      {content}
    </a>
  )
}

export default function TopLandingPagesCard({ pages, baseUrl, embedded = false }) {
  const { theme } = useTheme()

  const rows = pages.slice(0, 8)

  if (rows.length === 0 && !embedded) {
    return null
  }

  const content = (
    <>
      <p className={`text-xs font-semibold mb-4 ${theme.subtext}`}>Top Landing Pages</p>
      {rows.length === 0 ? (
        <p className={`text-sm ${theme.muted}`}>No landing page data yet.</p>
      ) : (
        <div>
          {rows.map((page, index) => (
            <LandingPageRow
              key={`${page.pagePath || page.path || '/'}-${index}`}
              page={page}
              baseUrl={baseUrl}
              theme={theme}
              isLast={index === rows.length - 1}
            />
          ))}
        </div>
      )}
    </>
  )

  if (embedded) {
    return content
  }

  return (
    <div className={`border rounded-xl p-5 ${theme.card}`}>
      {content}
    </div>
  )
}
