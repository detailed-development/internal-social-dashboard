import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTheme } from '../ThemeContext'

// Auth is checked via the Express backend (/api/auth/check) which proxies
// the request to WordPress server-side. This avoids CORS entirely: the browser
// makes a same-origin request to Express, Express forwards the WP session
// cookies (which the browser sends here because neoncactusmedia.com cookies
// apply to app.neoncactusmedia.com per RFC 6265 domain matching), and
// WordPress validates the session without any cross-origin configuration.
const WP_AUTH_URL = '/api/auth/check'
const WP_LOGIN    = 'https://neoncactusmedia.com/wp-login.php'

// sessionStorage key used to detect redirect loops.
// Set before we redirect to WP login; cleared on success or broken loop.
const LOOP_KEY = 'ncm_auth_redirect_pending'

export default function AuthGate() {
  const location = useLocation()
  const { theme } = useTheme()
  // 'checking' | 'ok' | 'forbidden' | 'login_failed' | 'endpoint_error' | 'network_error'
  const [state, setState] = useState('checking')
  // Actual HTTP status code from the last auth response (null = network error)
  const [lastStatus, setLastStatus] = useState(null)

  useEffect(() => {
    setState('checking')
    setLastStatus(null)

    fetch(WP_AUTH_URL, { credentials: 'include' })
      .then(res => {
        setLastStatus(res.status)

        if (res.status === 200) {
          sessionStorage.removeItem(LOOP_KEY)
          setState('ok')
        } else if (res.status === 403) {
          sessionStorage.removeItem(LOOP_KEY)
          setState('forbidden')
        } else if (res.status === 401) {
          if (sessionStorage.getItem(LOOP_KEY)) {
            // We already redirected to WP login and came back — still 401.
            // Break the loop instead of redirecting again.
            sessionStorage.removeItem(LOOP_KEY)
            setState('login_failed')
          } else {
            sessionStorage.setItem(LOOP_KEY, '1')
            window.location.replace(
              `${WP_LOGIN}?redirect_to=${encodeURIComponent(window.location.href)}`
            )
          }
        } else {
          // 404, 500, 503 etc. — the endpoint itself has a problem.
          sessionStorage.removeItem(LOOP_KEY)
          setState('endpoint_error')
        }
      })
      .catch(() => {
        // Network error — Express backend unreachable.
        sessionStorage.removeItem(LOOP_KEY)
        setLastStatus(null)
        setState('network_error')
      })
  }, [location.pathname])

  if (state === 'checking') {
    return (
      <div className={`flex items-center justify-center h-screen ${theme.appBg}`}>
        <span className={`text-sm ${theme.subtext}`}>Checking access…</span>
      </div>
    )
  }

  if (state === 'forbidden') {
    return (
      <div className={`flex items-center justify-center h-screen ${theme.appBg}`}>
        <div className="text-center space-y-3 max-w-sm px-6">
          <div className="text-4xl select-none">🚫</div>
          <h1 className={`text-xl font-semibold ${theme.heading}`}>Not authorised</h1>
          <p className={`text-sm ${theme.subtext}`}>
            You&apos;re logged in to WordPress but your account doesn&apos;t have the{' '}
            <strong>allow_isd</strong> capability required for this dashboard. Contact your
            administrator to have your role updated.
          </p>
          <p className={`text-xs ${theme.subtext} opacity-60`}>HTTP 403</p>
        </div>
      </div>
    )
  }

  if (state === 'login_failed') {
    return (
      <div className={`flex items-center justify-center h-screen ${theme.appBg}`}>
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="text-4xl select-none">⚠️</div>
          <h1 className={`text-xl font-semibold ${theme.heading}`}>Session not recognised</h1>
          <p className={`text-sm ${theme.subtext}`}>
            You logged in to WordPress but this dashboard still can&apos;t verify your session
            (HTTP 401). Your WordPress login cookie may not be reaching the auth endpoint.
            Try clearing your cookies and logging in again, or contact your developer.
          </p>
          <a
            href={`${WP_LOGIN}?redirect_to=${encodeURIComponent(window.location.href)}`}
            className={`inline-block text-sm underline ${theme.detailsLink}`}
          >
            Try logging in again
          </a>
        </div>
      </div>
    )
  }

  if (state === 'endpoint_error') {
    const isNotFound = lastStatus === 404
    const isServerError = lastStatus >= 500

    return (
      <div className={`flex items-center justify-center h-screen ${theme.appBg}`}>
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="text-4xl select-none">🔌</div>
          <h1 className={`text-xl font-semibold ${theme.heading}`}>
            {isNotFound ? 'Auth endpoint not found' : 'Auth check failed'}
          </h1>
          <p className={`text-sm ${theme.subtext}`}>
            {isNotFound
              ? <>
                  The auth endpoint returned 404. The WordPress plugin may not be active or the
                  route{' '}
                  <code className={`text-xs px-1 rounded ${theme.code}`}>ncm/v1/social-dashboard-access</code>{' '}
                  isn&apos;t registered. Check that the NCM Social Dashboard Auth plugin is enabled
                  on WordPress.
                </>
              : isServerError
              ? <>
                  WordPress returned a server error (HTTP {lastStatus}) when checking your
                  session. This is a problem on the WordPress side — check the WP error log.
                </>
              : <>
                  The backend returned an unexpected status (HTTP {lastStatus}) while verifying
                  your session. Check the{' '}
                  <code className={`text-xs px-1 rounded ${theme.code}`}>AUTH_CHECK_URL</code>{' '}
                  environment variable on the backend container.
                </>
            }
          </p>
          <a
            href={`${WP_LOGIN}?redirect_to=${encodeURIComponent(window.location.href)}`}
            className={`inline-block text-sm underline ${theme.detailsLink}`}
          >
            Go to WordPress login
          </a>
        </div>
      </div>
    )
  }

  if (state === 'network_error') {
    return (
      <div className={`flex items-center justify-center h-screen ${theme.appBg}`}>
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="text-4xl select-none">🔌</div>
          <h1 className={`text-xl font-semibold ${theme.heading}`}>Dashboard unreachable</h1>
          <p className={`text-sm ${theme.subtext}`}>
            The browser couldn&apos;t connect to the dashboard backend at all. The backend
            container may be down or starting up. Try refreshing in a moment — if it persists,
            check the Bunny container logs.
          </p>
          <button
            onClick={() => setState('checking')}
            className={`inline-block text-sm underline ${theme.detailsLink}`}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return <Outlet />
}
