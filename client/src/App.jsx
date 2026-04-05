import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './ThemeContext'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import ClientDetail from './pages/ClientDetail'
import Admin from './pages/Admin'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/clients/:slug" element={<ClientDetail />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
