import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { ActiveTool } from '@/types'

interface UseKeyboardOptions {
  onDelete?:  () => void
  onUndo?:    () => void
  onRedo?:    () => void
  onSave?:    () => void
  onZoomIn?:  () => void
  onZoomOut?: () => void
  onReset?:   () => void
}

// Tool shortcut map
const TOOL_KEYS: Record<string, ActiveTool> = {
  v: 'select',
  h: 'pan',
  w: 'wall',
  d: 'door',
  i: 'window',   // w taken → i for wIndow
  c: 'column',
  r: 'room',
  g: 'grid',
  m: 'dimension',
  t: 'text',
  l: 'line',
  e: 'eraser',
  b: 'rectangle',
}

export function useKeyboard(opts: UseKeyboardOptions) {
  const { setActiveTool, toggleGrid, setSnapMode, snapMode } = useAppStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in input/textarea
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const key = e.key.toLowerCase()

      // ── Tool shortcuts (no modifier) ──────────────
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (key in TOOL_KEYS) {
          e.preventDefault()
          setActiveTool(TOOL_KEYS[key])
          return
        }

        // Grid toggle
        if (key === "'") {
          e.preventDefault()
          toggleGrid()
          return
        }

        // Snap cycle: grid → endpoint → none → grid
        if (key === 's') {
          e.preventDefault()
          const next: Record<string, any> = {
            grid: 'endpoint', endpoint: 'none', none: 'grid'
          }
          setSnapMode(next[snapMode] ?? 'grid')
          return
        }

        // Delete
        if (key === 'delete' || key === 'backspace') {
          e.preventDefault()
          opts.onDelete?.()
          return
        }

        // Zoom
        if (key === '=' || key === '+') {
          e.preventDefault()
          opts.onZoomIn?.()
          return
        }
        if (key === '-') {
          e.preventDefault()
          opts.onZoomOut?.()
          return
        }
        if (key === '0') {
          e.preventDefault()
          opts.onReset?.()
          return
        }

        // Escape → select
        if (key === 'escape') {
          e.preventDefault()
          setActiveTool('select')
          return
        }
      }

      // ── With Ctrl/Cmd ─────────────────────────────
      if (e.ctrlKey || e.metaKey) {
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault()
          opts.onUndo?.()
          return
        }
        if (key === 'z' && e.shiftKey) {
          e.preventDefault()
          opts.onRedo?.()
          return
        }
        if (key === 'y') {
          e.preventDefault()
          opts.onRedo?.()
          return
        }
        if (key === 's') {
          e.preventDefault()
          opts.onSave?.()
          return
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [opts, setActiveTool, toggleGrid, setSnapMode, snapMode])
}
