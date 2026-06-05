import { Routes, Route, Navigate } from 'react-router-dom'
import SplashPage from '@/pages/SplashPage'
import ProjectSelectPage from '@/pages/ProjectSelectPage'
import DrawingPage from '@/pages/DrawingPage'

export default function App() {
  return (
    <Routes>
      {/* Splash / Landing */}
      <Route path="/" element={<SplashPage />} />

      {/* Project selection (from Hub) */}
      <Route path="/projects" element={<ProjectSelectPage />} />

      {/* Main drawing workspace */}
      <Route path="/draw/:projectId" element={<DrawingPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
