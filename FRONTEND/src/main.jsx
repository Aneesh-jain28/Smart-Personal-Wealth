import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'
import App from './App.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import ManageAccountsPage from './pages/ManageAccountsPage.jsx'
import ManageScenariosPage from './pages/ManageScenariosPage.jsx'
import AiChatPage from './pages/AiChatPage.jsx'
import TaxSimulatorPage from './pages/TaxSimulatorPage.jsx'
import BlackSwanPage from './pages/BlackSwanPage.jsx'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return user ? <Navigate to="/" replace /> : children
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
          <Route path="/accounts" element={<PrivateRoute><ManageAccountsPage /></PrivateRoute>} />
          <Route path="/scenarios" element={<PrivateRoute><ManageScenariosPage /></PrivateRoute>} />
          <Route path="/ai-chat" element={<PrivateRoute><AiChatPage /></PrivateRoute>} />
          <Route path="/tax-simulator" element={<PrivateRoute><TaxSimulatorPage /></PrivateRoute>} />
          <Route path="/black-swan" element={<PrivateRoute><BlackSwanPage /></PrivateRoute>} />
          <Route path="/*" element={<PrivateRoute><App /></PrivateRoute>} />
        </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
