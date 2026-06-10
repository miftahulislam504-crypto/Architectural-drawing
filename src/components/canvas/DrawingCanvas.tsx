import { useRef, useState, useCallback, useEffect } from 'react'
import { useCanvas } from '@/hooks/useCanvas'
import { useKeyboard } from '@/hooks/useKeyboard'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useAppStore } from '@/store/useAppStore'
import { formatMm } from '@/lib/canvasUtils'
import { optimizeCanvas, getCanvasStats } from '@/lib/performance'
import StatusBar from '@/components/ui/StatusBar'
import EmptyCanvasHint from '@/components/ui/EmptyCanvasHint'

interface DrawingCanvasProps {
  projectId:  string
  canvasRef?: React.MutableRefObject<any>
  onSave?:    () => void
}

export default function DrawingCanvas({
  projectId, canvasRef, onSave,
}: DrawingCanvasProps) {
  const { hubProject, activeTool, activeFloorId } = useAppStore()
  const [cursor, setCursor]  = useState({ x: 0, y: 0, xMm: 0, yMm: 0 })
  const [zoom,   setZoom]    = useState(1)
  const [stats,  setStats]   = useState({ total: 0, bim: 0 })
  const [showHint, setShowHint] = useState(true)

  const handleMouseMove = useCallback(
    (x: number, y: number, xMm: number, yMm: number) => {
      setCursor({ x, y, xMm, yMm })
    }, []
  )
  const handleZoomChange = useCallback((z: number) => setZoom(z), [])

  const {
    canvas, zoomIn, zoomOut, resetZoom,
    deleteSelected, undo, redo, saveHistory,
  } = useCanvas({
    canvasId:     'civilos-canvas',
    onMouseMove:  handleMouseMove,
    onZoomChange: handleZoomChange,
  })

  // Expose canvas to parent
  useEffect(() => {
    if (canvasRef && canvas) {
      canvasRef.current = canvas
      optimizeCanvas(canvas)
    }
  }, [canvas, canvasRef])

  // Auto-save hook
  const { saveStatus, lastSaved, save } = useAutoSave(
    canvas, projectId, activeFloorId ?? 'gf'
  )

  // Update canvas stats periodically
  useEffect(() => {
    if (!canvas) return
    const interval = setInterval(() => {
      const s = getCanvasStats(canvas)
      setStats(s)
      setShowHint(s.bim === 0)
    }, 2000)
    return () => clearInterval(interval)
  }, [canvas])

  useKeyboard({
    onDelete:  deleteSelected,
    onUndo:    undo,
    onRedo:    redo,
    onSave:    onSave ?? save,
    onZoomIn:  zoomIn,
    onZoomOut: zoomOut,
    onReset:   resetZoom,
  })

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <div className="flex-1 relative overflow-hidden" style={{ background: '#0D0F12' }}>

        <canvas id="civilos-canvas" className="absolute inset-0" />

        {/* Empty canvas hint */}
        {showHint && activeTool === 'select' && <EmptyCanvasHint />}

        {/* Tool hint */}
        {activeTool !== 'select' && activeTool !== 'pan' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10
                          bg-panel-bg/90 border border-panel-border rounded-lg
                          px-3 py-1.5 flex items-center gap-2 pointer-events-none backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse-soft" />
            <span className="text-2xs font-mono text-text-secondary uppercase tracking-wider">
              {TOOL_LABELS[activeTool] ?? activeTool}
            </span>
            <span className="text-2xs text-text-muted">ESC to cancel</span>
          </div>
        )}

        {/* Save status indicator */}
        <div className="absolute top-3 right-3 z-10">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-2xs font-mono
            ${saveStatus === 'saved'   ? 'text-accent-success bg-accent-success/10'
            : saveStatus === 'saving'  ? 'text-accent-primary bg-accent-primary/10'
            : saveStatus === 'unsaved' ? 'text-accent-warning bg-accent-warning/10'
            : 'text-accent-error bg-accent-error/10'}`}>
            <div className={`w-1.5 h-1.5 rounded-full
              ${saveStatus === 'saved'   ? 'bg-accent-success'
              : saveStatus === 'saving'  ? 'bg-accent-primary animate-pulse'
              : saveStatus === 'unsaved' ? 'bg-accent-warning'
              : 'bg-accent-error'}`} />
            {saveStatus === 'saved'   && (lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Saved')}
            {saveStatus === 'saving'  && 'Saving...'}
            {saveStatus === 'unsaved' && 'Unsaved'}
            {saveStatus === 'error'   && 'Save failed'}
          </div>
        </div>

        {/* Object count badge */}
        {stats.bim > 0 && (
          <div className="absolute bottom-12 right-3 z-10 text-2xs font-mono
                          text-text-muted bg-panel-bg/80 px-2 py-1 rounded border border-panel-border">
            {stats.bim} BIM · {stats.total} total
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute bottom-8 right-3 z-10 flex flex-col gap-1">
          <button onClick={zoomIn}
            className="w-8 h-8 bg-panel-bg border border-panel-border rounded
                       flex items-center justify-center text-text-secondary
                       hover:text-accent-primary hover:border-accent-primary/40
                       transition-colors text-sm font-mono"
            title="Zoom In (+)">+</button>
          <button onClick={resetZoom}
            className="w-8 h-8 bg-panel-bg border border-panel-border rounded
                       flex items-center justify-center text-text-muted
                       hover:text-text-secondary transition-colors text-2xs font-mono"
            title="Reset Zoom (0)">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={zoomOut}
            className="w-8 h-8 bg-panel-bg border border-panel-border rounded
                       flex items-center justify-center text-text-secondary
                       hover:text-accent-primary hover:border-accent-primary/40
                       transition-colors text-sm font-mono"
            title="Zoom Out (-)">−</button>
        </div>
      </div>

      <StatusBar
        x={cursor.xMm} y={cursor.yMm}
        zoom={zoom} tool={activeTool}
        projectName={hubProject?.name ?? ''}
        onUndo={undo} onRedo={redo}
      />
    </div>
  )
}

const TOOL_LABELS: Record<string, string> = {
  wall:      'Wall — click start, click end',
  door:      'Door — click to place (R=rotate)',
  window:    'Window — click to place (R=rotate)',
  column:    'Column — click to place',
  room:      'Room — click points, dbl-click to close',
  grid:      'Grid Line — click to add',
  dimension: 'Dimension — click 2 points',
  text:      'Text — click to add',
  line:      'Line — click start, click end',
  polyline:  'Polyline — click points, dbl-click finish',
  circle:    'Circle — click center, drag radius',
  rectangle: 'Rectangle — click and drag',
  eraser:    'Eraser — click object to delete',
}
