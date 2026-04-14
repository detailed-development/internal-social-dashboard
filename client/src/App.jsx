import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { ThemeProvider, useTheme } from './ThemeContext'
import { FeatureFlagsProvider } from './experiments/FeatureFlagsProvider'
import AuthGate from './components/AuthGate'
import Layout from './components/Layout'
import Overview from './pages/Overview'

// Heavy pages loaded on demand — keeps initial bundle small
const ClientDetail = lazy(() => import('./pages/ClientDetail'))
const Admin = lazy(() => import('./pages/Admin'))
const AITools = lazy(() => import('./pages/AITools'))

const bypassAuth = import.meta.env.VITE_BYPASS_AUTH === 'true'

function PageLoader() {
  const { theme } = useTheme()
  return (
    <div className="flex items-center justify-center h-64">
      <span className={`text-sm ${theme.muted}`}>Loading…</span>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <FeatureFlagsProvider>
        <BrowserRouter>
          <Routes>
            {bypassAuth ? (
              <Route element={<Layout />}>
                <Route path="/" element={<Overview />} />
                <Route
                  path="/clients/:slug"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ClientDetail />
                    </Suspense>
                  }
                />
                <Route
                  path="/ai-tools"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AITools />
                    </Suspense>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <Admin />
                    </Suspense>
                  }
                />
              </Route>
            ) : (
              <Route element={<AuthGate />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Overview />} />
                  <Route
                    path="/clients/:slug"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <ClientDetail />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/ai-tools"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <AITools />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Admin />
                      </Suspense>
                    }
                  />
                </Route>
              </Route>
            )}
          </Routes>
        </BrowserRouter>
      </FeatureFlagsProvider>
    </ThemeProvider>
  )
}
