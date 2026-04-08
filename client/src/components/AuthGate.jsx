import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTheme } from '../ThemeContext'

// Called directly from the browser so the browser's own WP session cookies
// are included automatically — no cross-domain cookie forwarding needed.
const WP_AUTH_URL = 'https://neoncactusmedia.com/wp-json/ncm/v1/social-dashboard-access'
const WP_LOGIN    = 'https://neoncactusmedia.com/wp-login.php'

// sessionStorage key used to detect redirect loops.
// Set before we redirect to WP login; cleared on success or broken loop.
const LOOP_KEY = 'ncm_auth_redirect_pending'

export default function AuthGate() {
  const location = useLocation()
  const { theme } = useTheme()
  // 'checking' | 'ok' | 'forbidden' | 'login_failed' | 'endpoint_error'
  const [state, setState] = useState('checking')

  useEffect(() => {
    setState('checking')

    fetch(WP_AUTH_URL, { credentials: 'include', mode: 'cors' })
      .then(res => {
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
          // 404, 500, etc. — the endpoint itself has a problem.
          sessionStorage.removeItem(LOOP_KEY)
          setState('endpoint_error')
        }
      })
      .catch(() => {
        // Network error or CORS rejection — endpoint unreachable.
        sessionStorage.removeItem(LOOP_KEY)
        setState('endpoint_error')
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
            Your account doesn&apos;t have access to this dashboard. Contact your administrator
            if you believe this is an error.
          </p>
        </div>
      </div>
    )
  }

  if (state === 'login_failed') {
    return (
      <div className={`flex items-center justify-center h-screen ${theme.appBg}`}>
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="text-4xl select-none">⚠️</div>
          <h1 className={`text-xl font-semibold ${theme.heading}`}>Still not signed in</h1>
          <p className={`text-sm ${theme.subtext}`}>
            You were redirected to WordPress but the session isn&apos;t being recognised here.
            This is usually a cookie or CORS issue on the auth endpoint — check with your
            developer.
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
    return (
      <div className={`flex items-center justify-center h-screen ${theme.appBg}`}>
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="text-4xl select-none">🔌</div>
          <h1 className={`text-xl font-semibold ${theme.heading}`}>Auth endpoint unreachable</h1>
          <p className={`text-sm ${theme.subtext}`}>
            The dashboard couldn&apos;t reach the authentication endpoint at{' '}
            <code className={`text-xs px-1 rounded ${theme.code}`}>
              /wp-json/ncm/v1/social-dashboard-access
            </code>
            . The endpoint may not exist yet, or may be missing CORS headers for this origin.
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

  return <Outlet />
}
