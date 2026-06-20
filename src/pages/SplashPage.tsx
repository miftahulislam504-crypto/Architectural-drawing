import { useNavigate } from 'react-router-dom'
import { Layers, Grid3x3, FileText, Ruler, ArrowRight, Cpu } from 'lucide-react'

export default function SplashPage() {
  const navigate = useNavigate()

  const features = [
    { icon: <Grid3x3 size={18} />, label: 'BIM Smart Objects' },
    { icon: <Ruler size={18} />,   label: 'BNBC Compliance' },
    { icon: <Layers size={18} />,  label: 'Multi-floor System' },
    { icon: <FileText size={18} />, label: 'Auto Schedules' },
  ]

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Background grid pattern */}
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

      {/* Content */}
      <div className="relative z-10 text-center max-w-md w-full">

        {/* Logo mark */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center border border-accent-primary/30 bg-panel-bg"
            style={{ boxShadow: '0 4px 20px rgba(26,86,219,0.15)' }}>
            <Cpu size={32} className="text-accent-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="mb-2">
          <span className="text-xs font-mono tracking-[0.3em] uppercase text-accent-primary/70">
            CivilOS Suite
          </span>
        </div>
        <h1 className="font-display font-bold text-text-primary mb-1"
          style={{ fontSize: '2rem', lineHeight: 1.1 }}>
          Architectural
        </h1>
        <h2 className="font-display font-bold mb-4"
          style={{ fontSize: '2rem', lineHeight: 1.1, color: '#1a56db' }}>
          Drawing App
        </h2>

        <p className="text-text-secondary text-sm mb-2">
          Professional BIM-based architectural design platform
        </p>
        <p className="text-text-muted text-xs mb-8">
          Professional architectural drawing software per BNBC 2020
        </p>

        {/* Features */}
        <div className="grid grid-cols-2 gap-2 mb-8">
          {features.map((f, i) => (
            <div key={i}
              className="flex items-center gap-2 bg-panel-bg border border-panel-border rounded-lg px-3 py-2.5">
              <span className="text-accent-primary">{f.icon}</span>
              <span className="text-text-secondary text-xs">{f.label}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={() => navigate('/projects')}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-display font-semibold text-text-inverse transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #1a56db, #1e429f)',
            boxShadow: '0 6px 20px rgba(26,86,219,0.3)',
          }}
        >
          <span>Open Project</span>
          <ArrowRight size={18} />
        </button>

        <p className="text-text-muted text-2xs mt-4 font-mono">
          Import a project from Hub
        </p>
      </div>

      {/* Bottom badge */}
      <div className="absolute bottom-6 text-2xs font-mono text-text-muted">
        CivilOS v1.0 · Built for Bangladesh Construction Industry
      </div>
    </div>
  )
}
