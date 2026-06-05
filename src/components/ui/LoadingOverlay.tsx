import type { SyncState } from '@/hooks/useProjectSync'
import { CheckCircle, Circle, Loader2, XCircle, RefreshCw } from 'lucide-react'

interface LoadingOverlayProps {
  syncState: SyncState
  onRetry:   () => void
}

export default function LoadingOverlay({ syncState, onRetry }: LoadingOverlayProps) {
  const { status, message, loaded } = syncState

  const items = [
    { key: 'project',      label: 'Project Info' },
    { key: 'siteInfo',     label: 'Site Information' },
    { key: 'bnbcSettings', label: 'BNBC Settings' },
    { key: 'buildingInfo', label: 'Building Info' },
  ] as const

  return (
    <div className="absolute inset-0 z-50 bg-canvas-bg/95 backdrop-blur-sm
                    flex items-center justify-center">
      <div
        className="bg-panel-bg border border-panel-border rounded-2xl p-6 w-72"
        style={{ boxShadow: '0 0 40px rgba(0,0,0,0.6)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse-soft" />
          <span className="text-xs font-display font-semibold text-text-primary tracking-wide">
            CivilOS Architectural
          </span>
        </div>

        {/* Status message */}
        <div className="flex items-center gap-2 mb-4">
          {status === 'loading' && (
            <Loader2 size={14} className="text-accent-primary animate-spin shrink-0" />
          )}
          {status === 'error' && (
            <XCircle size={14} className="text-accent-error shrink-0" />
          )}
          <p className="text-xs text-text-secondary font-bengali leading-snug">
            {message}
          </p>
        </div>

        {/* Checklist */}
        <div className="flex flex-col gap-2 mb-5">
          {items.map(({ key, label }) => {
            const done = loaded[key]
            return (
              <div key={key} className="flex items-center gap-2.5">
                {done ? (
                  <CheckCircle size={13} className="text-accent-success shrink-0" />
                ) : status === 'loading' ? (
                  <Circle size={13} className="text-text-muted shrink-0 animate-pulse" />
                ) : (
                  <Circle size={13} className="text-text-muted shrink-0 opacity-40" />
                )}
                <span className={`text-xs ${done ? 'text-text-primary' : 'text-text-muted'}`}>
                  {label}
                </span>
                {!done && status === 'success' && (
                  <span className="text-2xs text-text-muted font-mono ml-auto">
                    not set
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Error retry */}
        {status === 'error' && (
          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg
                       border border-accent-primary/40 text-accent-primary text-xs
                       hover:bg-accent-primary/10 transition-colors"
          >
            <RefreshCw size={12} />
            আবার চেষ্টা করুন
          </button>
        )}

        {/* Hint — missing data */}
        {status === 'success' && (!loaded.siteInfo || !loaded.bnbcSettings) && (
          <p className="text-2xs text-text-muted text-center font-bengali leading-relaxed">
            Hub-এ Site Info বা BNBC Settings না থাকলে
            drawing করা যাবে, তবে compliance check কাজ করবে না।
          </p>
        )}
      </div>
    </div>
  )
}
