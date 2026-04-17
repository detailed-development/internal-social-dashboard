import { useCallback, useEffect, useRef, useState } from 'react'

const WP_AUTH_URL = '/api/auth/check'
const WP_LOGIN = 'https://neoncactusmedia.com/wp-login.php'
const LOOP_KEY = 'ncm_auth_redirect_pending'
const LOOP_TTL = 120000
const RECHECK_INTERVAL = 15 * 60_000
const MAX_RETRIES = 2
const RETRY_DELAY = 1000

function isLoopFlagSet() {
  try {
    const ts = localStorage.getItem(LOOP_KEY)
    if (!ts) return false
    return Date.now() - parseInt(ts, 10) < LOOP_TTL
  } catch {
    return false
  }
}

function setLoopFlag() {
  try {
    localStorage.setItem(LOOP_KEY, String(Date.now()))
  } catch {}
}

function clearLoopFlag() {
  try {
    localStorage.removeItem(LOOP_KEY)
  } catch {}
}

function getLoginUrl() {
  return `${WP_LOGIN}?redirect_to=${encodeURIComponent(window.location.href)}`
}

export function useAuthGate() {
  const [state, setState] = useState('checking')
  const abortRef = useRef(null)

  const runAuthCheck = useCallback((showSpinner = true) => {
    if (showSpinner) {
      setState('checking')
    }

    abortRef.current?.abort()

    const controller = new AbortController()
    abortRef.current = controller
    let retries = 0

    function scheduleRetry() {
      setTimeout(() => {
        if (!controller.signal.aborted) {
          runCheck()
        }
      }, RETRY_DELAY)
    }

    function handleUnauthorized() {
      if (isLoopFlagSet() && retries < MAX_RETRIES) {
        retries += 1
        scheduleRetry()
        return
      }

      if (isLoopFlagSet()) {
        clearLoopFlag()
        setState('login_failed')
        return
      }

      setLoopFlag()
      window.location.replace(getLoginUrl())
    }

    function handleResponse(res) {
      if (res.status === 200) {
        clearLoopFlag()
        setState('ok')
        return
      }

      if (res.status === 403) {
        clearLoopFlag()
        setState('forbidden')
        return
      }

      if (res.status === 401) {
        handleUnauthorized()
        return
      }

      clearLoopFlag()
      setState('endpoint_error')
    }

    function runCheck() {
      fetch(WP_AUTH_URL, {
        credentials: 'include',
        signal: controller.signal,
      })
        .then((res) => {
          if (controller.signal.aborted) return
          handleResponse(res)
        })
        .catch(() => {
          if (controller.signal.aborted) return
          clearLoopFlag()
          setState('endpoint_error')
        })
    }

    runCheck()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const cleanup = runAuthCheck(true)

    const interval = setInterval(() => {
      runAuthCheck(false)
    }, RECHECK_INTERVAL)

    return () => {
      cleanup()
      clearInterval(interval)
    }
  }, [runAuthCheck])

  const retry = useCallback(() => {
    clearLoopFlag()
    setState('checking')
    window.location.reload()
  }, [])

  return {
    state,
    retry,
    loginUrl: getLoginUrl(),
  }
}
