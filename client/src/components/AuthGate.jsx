import { useEffect, useState, useRef, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { useTheme } from '../ThemeContext'

// Auth is checked via the Express backend (/api/auth/check) which proxies
// the request to WordPress server-side. This avoids CORS entirely: the browser
// makes a same-origin request to Express, Express forwards the WP session
// cookies (which the browser sends here because neoncactusmedia.com cookies
// apply to the dashboard subdomain per RFC 6265 domain matching — provided
// WordPress sets cookies with Domain=.neoncactusmedia.com), and WordPress
// validates the session without any cross-origin configuration.
const WP_AUTH_URL = '/api/auth/check'
const WP_LOGIN    = 'https://neoncactusmedia.com/wp-login.php'

// localStorage key + timestamp used to detect redirect loops.
// Set before we redirect to WP login; cleared on success or broken loop.
// Uses localStorage (not sessionStorage) so it persists even if the redirect
// chain passes through a different origin (e.g. /app-gateway/ on the WP domain).
const LOOP_KEY = 'ncm_auth_redirect_pending'
const LOOP_TTL = 120_000 // 2 minutes — flag auto-expires after this
const RECHECK_INTERVAL = 15 * 60_000 // re-verify session every 15 minutes

function isLoopFlagSet() {
  try {
    const ts = localStorage.getItem(LOOP_KEY)
    if (!ts) return false
    return Date.now() - parseInt(ts, 10) < LOOP_TTL
  } catch { return false }
}
function setLoopFlag() {
  try { localStorage.setItem(LOOP_KEY, String(Date.now())) } catch {}
}
function clearLoopFlag() {
  try { localStorage.removeItem(LOOP_KEY) } catch {}
}

export default function AuthGate() {
  const { theme } = useTheme()
  // 'checking' | 'ok' | 'forbidden' | 'login_failed' | 'endpoint_error'
  const [state, setState] = useState('checking')
  const abortRef = useRef(null)

  const runAuthCheck = useCallback((showSpinner = true) => {
    if (showSpinner) setState('checking')

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    let retries = 0
    const MAX_RETRIES = 2
    const RETRY_DELAY = 1000

    function runCheck() {
      fetch(WP_AUTH_URL, {
        credentials: 'include',
        signal: controller.signal,
      })
        .then(res => {
          if (controller.signal.aborted) return

          if (res.status === 200) {
            clearLoopFlag()
            setState('ok')
          } else if (res.status === 403) {
            clearLoopFlag()
            setState('forbidden')
          } else if (res.status === 401) {
            if (isLoopFlagSet() && retries < MAX_RETRIES) {
              retries++
              setTimeout(runCheck, RETRY_DELAY)
              return
            }

            if (isLoopFlagSet()) {
              clearLoopFlag()
              setState('login_failed')
            } else {
              setLoopFlag()
              window.location.replace(
                `${WP_LOGIN}?redirect_to=${encodeURIComponent(window.location.href)}`
              )
            }
          } else {
            clearLoopFlag()
            setState('endpoint_error')
          }
        })
        .catch(err => {
          if (controller.signal.aborted) return
          clearLoopFlag()
          setState('endpoint_error')
        })
    }

    runCheck()
    return () => controller.abort()
  }, [])

  // Check auth once on mount, then silently re-verify every 15 minutes
  useEffect(() => {
    const cleanup = runAuthCheck(true)

    const interval = setInterval(() => {
      runAuthCheck(false) // silent — no "Checking access…" spinner
    }, RECHECK_INTERVAL)

    return () => { cleanup(); clearInterval(interval) }
  }, [])

  function handleRetry() {
    clearLoopFlag()
    setState('checking')
    // Trigger a fresh auth check by reloading
    window.location.reload()
  }

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
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="text-4xl select-none">⚠️</div>
          <h1 className={`text-xl font-semibold ${theme.heading}`}>Still not signed in</h1>
          <p className={`text-sm ${theme.subtext}`}>
            You were redirected to WordPress but the session isn&apos;t being recognised here.
            This usually means the WordPress session cookie isn&apos;t reaching this subdomain.
          </p>
          <details className={`text-left text-xs ${theme.subtext}`}>
            <summary className="cursor-pointer font-semibold hover:opacity-80">Troubleshooting</summary>
            <ul className="mt-2 space-y-1.5 list-disc list-inside">
              <li>
                Ensure <code className={`px-1 rounded ${theme.code}`}>COOKIE_DOMAIN</code> is
                set to <code className={`px-1 rounded ${theme.code}`}>.neoncactusmedia.com</code> in
                your WordPress <code className={`px-1 rounded ${theme.code}`}>wp-config.php</code> so
                cookies apply to subdomains.
              </li>
              <li>Try logging in to WordPress directly at <code className={`px-1 rounded ${theme.code}`}>neoncactusmedia.com</code> first, then navigate here.</li>
              <li>Make sure your browser isn&apos;t blocking third-party cookies.</li>
              <li>If using incognito / private mode, cookie restrictions may be stricter.</li>
            </ul>
          </details>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              onClick={handleRetry}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${theme.btnPrimary}`}
            >
              Retry
            </button>
            <a
              href={`${WP_LOGIN}?redirect_to=${encodeURIComponent(window.location.href)}`}
              className={`inline-block text-sm underline ${theme.detailsLink}`}
            >
              Try logging in again
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'endpoint_error') {
    return (
      <div className={`flex items-center justify-center h-screen ${theme.appBg}`}>
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="text-4xl select-none">🔌</div>
          <h1 className={`text-xl font-semibold ${theme.heading}`}>Auth check failed</h1>
          <p className={`text-sm ${theme.subtext}`}>
            The dashboard couldn&apos;t verify your session. This usually means the
            WordPress auth endpoint isn&apos;t reachable from the server, or the{' '}
            <code className={`text-xs px-1 rounded ${theme.code}`}>AUTH_CHECK_URL</code>{' '}
            environment variable isn&apos;t set on the backend container.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              onClick={handleRetry}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${theme.btnPrimary}`}
            >
              Retry
            </button>
            <a
              href={`${WP_LOGIN}?redirect_to=${encodeURIComponent(window.location.href)}`}
              className={`inline-block text-sm underline ${theme.detailsLink}`}
            >
              Go to WordPress login
            </a>
          </div>
        </div>
      </div>
    )
  }

  return <Outlet />
}
