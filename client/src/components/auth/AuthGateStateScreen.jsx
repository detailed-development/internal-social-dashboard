import { useTheme } from '../../ThemeContext'

function CenteredScreen({ children }) {
  const { theme } = useTheme()

  return (
    <div className={`flex items-center justify-center h-screen ${theme.appBg}`}>
      {children}
    </div>
  )
}

function ActionRow({ children }) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
      {children}
    </div>
  )
}

function PrimaryButton({ children, onClick }) {
  const { theme } = useTheme()

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${theme.btnPrimary}`}
    >
      {children}
    </button>
  )
}

function TextLink({ children, href }) {
  const { theme } = useTheme()

  return (
    <a
      href={href}
      className={`inline-block text-sm underline ${theme.detailsLink}`}
    >
      {children}
    </a>
  )
}

function ScreenContent({ icon, title, children, width = 'max-w-sm' }) {
  const { theme } = useTheme()

  return (
    <div className={`text-center space-y-4 ${width} px-6`}>
      <div className="text-4xl select-none">{icon}</div>
      <h1 className={`text-xl font-semibold ${theme.heading}`}>{title}</h1>
      {children}
    </div>
  )
}

export default function AuthGateStateScreen({ state, loginUrl, onRetry }) {
  const { theme } = useTheme()

  if (state === 'checking') {
    return (
      <CenteredScreen>
        <span className={`text-sm ${theme.subtext}`}>Checking access…</span>
      </CenteredScreen>
    )
  }

  if (state === 'forbidden') {
    return (
      <CenteredScreen>
        <ScreenContent icon="🚫" title="Not authorised">
          <p className={`text-sm ${theme.subtext}`}>
            Your account doesn&apos;t have access to this dashboard. Contact your administrator
            if you believe this is an error.
          </p>
        </ScreenContent>
      </CenteredScreen>
    )
  }

  if (state === 'login_failed') {
    return (
      <CenteredScreen>
        <ScreenContent icon="⚠️" title="Still not signed in" width="max-w-md">
          <p className={`text-sm ${theme.subtext}`}>
            You were redirected to WordPress but the session isn&apos;t being recognised here.
            This usually means the WordPress session cookie isn&apos;t reaching this subdomain.
          </p>

          <details className={`text-left text-xs ${theme.subtext}`}>
            <summary className="cursor-pointer font-semibold hover:opacity-80">Troubleshooting</summary>
            <ul className="mt-2 space-y-1.5 list-disc list-inside">
              <li>
                Ensure <code className={`px-1 rounded ${theme.code}`}>COOKIE_DOMAIN</code> is set to{' '}
                <code className={`px-1 rounded ${theme.code}`}>.neoncactusmedia.com</code> in your{' '}
                WordPress <code className={`px-1 rounded ${theme.code}`}>wp-config.php</code> so cookies
                apply to subdomains.
              </li>
              <li>
                Try logging in to WordPress directly at{' '}
                <code className={`px-1 rounded ${theme.code}`}>neoncactusmedia.com</code> first, then
                navigate here.
              </li>
              <li>Make sure your browser isn&apos;t blocking third-party cookies.</li>
              <li>If using incognito / private mode, cookie restrictions may be stricter.</li>
            </ul>
          </details>

          <ActionRow>
            <PrimaryButton onClick={onRetry}>Retry</PrimaryButton>
            <TextLink href={loginUrl}>Try logging in again</TextLink>
          </ActionRow>
        </ScreenContent>
      </CenteredScreen>
    )
  }

  if (state === 'endpoint_error') {
    return (
      <CenteredScreen>
        <ScreenContent icon="🔌" title="Auth check failed">
          <p className={`text-sm ${theme.subtext}`}>
            The dashboard couldn&apos;t verify your session. This usually means the WordPress auth
            endpoint isn&apos;t reachable from the server, or the{' '}
            <code className={`text-xs px-1 rounded ${theme.code}`}>AUTH_CHECK_URL</code> environment
            variable isn&apos;t set on the backend container.
          </p>

          <ActionRow>
            <PrimaryButton onClick={onRetry}>Retry</PrimaryButton>
            <TextLink href={loginUrl}>Go to WordPress login</TextLink>
          </ActionRow>
        </ScreenContent>
      </CenteredScreen>
    )
  }

  return null
}
