import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Cpu, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const navigate  = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Email and password are required.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      navigate('/projects')
    } catch (err: any) {
      const code = err?.code ?? ''
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError('Invalid email or password.')
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.')
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.')
      } else {
        setError('Login failed. Check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(#1a56db 1px, transparent 1px),
            linear-gradient(90deg, #1a56db 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, #1a56db, transparent)' }}
      />

      <div className="relative z-10 w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center border border-accent-primary/30 bg-panel-bg mb-4"
            style={{ boxShadow: '0 4px 20px rgba(26,86,219,0.15)' }}
          >
            <Cpu size={32} className="text-accent-primary" />
          </div>
          <span className="text-xs font-mono tracking-[0.3em] uppercase text-accent-primary/70 mb-1">
            CivilOS Suite
          </span>
          <h1 className="font-display font-bold text-text-primary text-2xl">
            Architectural
          </h1>
          <p className="text-text-muted text-xs mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div
          className="bg-panel-bg border border-panel-border rounded-2xl p-6 flex flex-col gap-4"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        >

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-400 text-xs leading-relaxed">{error}</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="text-2xs text-text-muted font-mono uppercase tracking-wider mb-1.5 block">
              Email
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="email"
                className="cad-input pl-9 w-full"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-2xs text-text-muted font-mono uppercase tracking-wider mb-1.5 block">
              Password
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="password"
                className="cad-input pl-9 w-full"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-display font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:scale-100 mt-1"
            style={{
              background: 'linear-gradient(135deg, #1a56db, #1e429f)',
              boxShadow: '0 6px 20px rgba(26,86,219,0.3)',
            }}
          >
            {loading ? (
              <div className="spinner" style={{ width: 16, height: 16 }} />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        <p className="text-center text-2xs text-text-muted mt-6 font-mono">
          CivilOS v1.0 · Built for Bangladesh Construction Industry
        </p>
      </div>
    </div>
  )
}
