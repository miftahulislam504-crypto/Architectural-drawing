import { useAppStore } from '@/store/useAppStore'
import {
  Minus, Columns, DoorOpen, AppWindow,
  Square, Grid3x3, ArrowRight,
} from 'lucide-react'

export default function EmptyCanvasHint() {
  const { setActiveTool } = useAppStore()

  const steps = [
    { icon: <Grid3x3  size={14} />, key: 'grid' as const,   label: '1. Grid আঁকুন',    color: '#1E6A9A' },
    { icon: <Columns  size={14} />, key: 'column' as const, label: '2. Column বসান',   color: '#EF4444' },
    { icon: <Minus    size={14} />, key: 'wall' as const,   label: '3. Wall আঁকুন',    color: '#64748B' },
    { icon: <DoorOpen size={14} />, key: 'door' as const,   label: '4. Door বসান',     color: '#F59E0B' },
    { icon: <AppWindow size={14}/>, key: 'window' as const, label: '5. Window বসান',   color: '#00B4D8' },
    { icon: <Square   size={14} />, key: 'room' as const,   label: '6. Room tag করুন', color: '#10B981' },
  ]

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div
        className="bg-panel-bg/80 border border-panel-border rounded-2xl p-6
                   backdrop-blur-sm pointer-events-auto max-w-xs w-full mx-4"
        style={{ boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}
      >
        {/* Title */}
        <p className="text-xs font-display font-bold text-text-primary text-center mb-1">
          শুরু করুন
        </p>
        <p className="text-2xs text-text-muted text-center mb-4 font-bengali">
          নিচের order-এ কাজ করুন
        </p>

        {/* Steps */}
        <div className="flex flex-col gap-1.5 mb-4">
          {steps.map((step, i) => (
            <button
              key={step.key}
              onClick={() => setActiveTool(step.key)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg
                         border border-panel-border hover:border-opacity-60
                         hover:bg-panel-hover transition-all text-left group"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${step.color}20`, color: step.color }}>
                {step.icon}
              </div>
              <span className="text-2xs text-text-secondary group-hover:text-text-primary
                               transition-colors flex-1">
                {step.label}
              </span>
              <ArrowRight size={11} className="text-text-muted opacity-0
                                               group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>

        {/* Shortcuts */}
        <div className="border-t border-panel-border pt-3">
          <p className="text-2xs text-text-muted text-center mb-2 font-mono">
            KEYBOARD SHORTCUTS
          </p>
          <div className="grid grid-cols-3 gap-1">
            {[
              ['G', 'Grid'], ['C', 'Column'], ['W', 'Wall'],
              ['D', 'Door'], ['I', 'Window'], ['R', 'Room'],
            ].map(([key, label]) => (
              <div key={key}
                className="flex items-center gap-1 text-2xs text-text-muted">
                <span className="badge">{key}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
