import { Outlet } from 'react-router-dom'
import AuthGateStateScreen from './auth/AuthGateStateScreen'
import { useAuthGate } from '../hooks/useAuthGate'

export default function AuthGate() {
  const { state, retry, loginUrl } = useAuthGate()

  if (state === 'ok') {
    return <Outlet />
  }

  return <AuthGateStateScreen state={state} loginUrl={loginUrl} onRetry={retry} />
}
