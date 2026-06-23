import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import LoginPage         from '@/pages/LoginPage'
import ProjectSelectPage from '@/pages/ProjectSelectPage'
import DrawingPage       from '@/pages/DrawingPage'

// Show nothing while Firebase checks auth state
function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready,    setReady]    = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setLoggedIn(!!user)
      setReady(true)
    })
    return () => unsub()
  }, [])

  if (!ready) return null   // brief flash prevention

  return loggedIn
    ? <>{children}</>
    : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route path="/projects" element={
        <AuthGate><ProjectSelectPage /></AuthGate>
      } />
      <Route path="/draw/:projectId" element={
        <AuthGate><DrawingPage /></AuthGate>
      } />

      {/* Default → login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
