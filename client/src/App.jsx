import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './ThemeContext'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import ClientDetail from './pages/ClientDetail'
import Admin from './pages/Admin'
import AITools from './pages/AITools'

const APP_BASE = '/internal-social-dashboard/app'

function getBasename() {
  return window.location.pathname.startsWith(APP_BASE) ? APP_BASE : '/'
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter basename={getBasename()}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/clients/:slug" element={<ClientDetail />} />
            <Route path="/ai-tools" element={<AITools />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
