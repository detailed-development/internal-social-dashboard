import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTheme } from '../ThemeContext'

const WP_LOGIN = 'https://neoncactusmedia.com/wp-login.php'

/**
 * Wraps every route and re-verifies the user's session on every navigation.
 *
 * GET /api/auth/check returns:
 *   200  → authenticated & authorised  → render the app
 *   401  → not logged in               → redirect to WordPress login
 *   403  → logged in but no access     → show "Not authorised" page
 */
export default function AuthGate() {
  const location = useLocation()
  const { theme } = useTheme()
  const [state, setState] = useState('checking') // 'checking' | 'ok' | 'forbidden'

  useEffect(() => {
    setState('checking')

    fetch('/api/auth/check', { credentials: 'include' })
      .then(res => {
        if (res.status === 200) {
          setState('ok')
        } else if (res.status === 403) {
          setState('forbidden')
        } else {
          // 401 or any unexpected status — send to WordPress login
          const redirectTo = encodeURIComponent(window.location.href)
          window.location.replace(`${WP_LOGIN}?redirect_to=${redirectTo}`)
        }
      })
      .catch(() => setState('forbidden'))
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
            You don&apos;t have permission to access this dashboard. Contact your administrator
            if you believe this is an error.
          </p>
        </div>
      </div>
    )
  }

  return <Outlet />
}
