import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

// ─── Toast Types ──────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id:      string
  type:    ToastType
  message: string
  duration?: number
}

// ─── Global toast store (simple) ─────────────────────
type Listener = (toasts: ToastItem[]) => void
let _toasts:   ToastItem[] = []
let _listeners: Listener[] = []

function notify() {
  _listeners.forEach((l) => l([..._toasts]))
}

export const toast = {
  show(message: string, type: ToastType = 'info', duration = 3000) {
    const id = Math.random().toString(36).slice(2)
    _toasts = [..._toasts, { id, type, message, duration }]
    notify()
    if (duration > 0) {
      setTimeout(() => toast.dismiss(id), duration)
    }
  },
  success: (msg: string) => toast.show(msg, 'success'),
  error:   (msg: string) => toast.show(msg, 'error', 5000),
  warning: (msg: string) => toast.show(msg, 'warning'),
  info:    (msg: string) => toast.show(msg, 'info'),
  dismiss(id: string) {
    _toasts = _toasts.filter((t) => t.id !== id)
    notify()
  },
}

// ─── Toast Container Component ────────────────────────
export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    _listeners.push(setToasts)
    return () => {
      _listeners = _listeners.filter((l) => l !== setToasts)
    }
  }, [])

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-8 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} item={t} />
      ))}
    </div>
  )
}

// ─── Individual Toast ─────────────────────────────────
function ToastItem({ item }: { item: ToastItem }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const configs = {
    success: {
      icon:   <CheckCircle  size={14} />,
      color:  'text-accent-success',
      border: 'border-accent-success/30',
      bg:     'bg-accent-success/10',
    },
    error: {
      icon:   <XCircle      size={14} />,
      color:  'text-accent-error',
      border: 'border-accent-error/30',
      bg:     'bg-accent-error/10',
    },
    warning: {
      icon:   <AlertTriangle size={14} />,
      color:  'text-accent-warning',
      border: 'border-accent-warning/30',
      bg:     'bg-accent-warning/10',
    },
    info: {
      icon:   <Info size={14} />,
      color:  'text-accent-primary',
      border: 'border-accent-primary/30',
      bg:     'bg-accent-primary/10',
    },
  }

  const cfg = configs[item.type]

  return (
    <div
      className={`
        pointer-events-auto flex items-center gap-2
        border rounded-lg px-3 py-2.5 backdrop-blur-sm
        transition-all duration-200 shadow-panel
        ${cfg.border} ${cfg.bg}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
      style={{ minWidth: '200px', maxWidth: '300px' }}
    >
      <span className={cfg.color}>{cfg.icon}</span>
      <span className="text-text-primary text-xs flex-1 leading-snug">
        {item.message}
      </span>
      <button
        onClick={() => toast.dismiss(item.id)}
        className="text-text-muted hover:text-text-primary transition-colors ml-1"
      >
        <X size={12} />
      </button>
    </div>
  )
}
