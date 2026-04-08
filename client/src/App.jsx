import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './ThemeContext'
import AuthGate from './components/AuthGate'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import ClientDetail from './pages/ClientDetail'
import Admin from './pages/Admin'
import AITools from './pages/AITools'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AuthGate />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Overview />} />
              <Route path="/clients/:slug" element={<ClientDetail />} />
              <Route path="/ai-tools" element={<AITools />} />
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
