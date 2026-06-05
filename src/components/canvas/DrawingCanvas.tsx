import { useRef, useState, useCallback, useEffect } from 'react'
import { useCanvas } from '@/hooks/useCanvas'
import { useKeyboard } from '@/hooks/useKeyboard'
import { useAppStore } from '@/store/useAppStore'
import { formatMm } from '@/lib/canvasUtils'
import StatusBar from '@/components/ui/StatusBar'

interface DrawingCanvasProps {
  projectId: string
  canvasRef?: React.MutableRefObject<any>
  onSave?:   () => void
}

export default function DrawingCanvas({ projectId, canvasRef, onSave }: DrawingCanvasProps) {
  const { hubProject, activeTool } = useAppStore()
  const [cursor, setCursor] = useState({ x: 0, y: 0, xMm: 0, yMm: 0 })
  const [zoom,   setZoom]   = useState(1)

  const handleMouseMove = useCallback(
    (x: number, y: number, xMm: number, yMm: number) => {
      setCursor({ x, y, xMm, yMm })
    }, []
  )
  const handleZoomChange = useCallback((z: number) => setZoom(z), [])

  const {
    canvas,
    zoomIn, zoomOut, resetZoom,
    deleteSelected, undo, redo, saveHistory,
  } = useCanvas({
    canvasId:     'civilos-canvas',
    onMouseMove:  handleMouseMove,
    onZoomChange: handleZoomChange,
  })

  // Expose canvas to parent via ref
  useEffect(() => {
    if (canvasRef && canvas) {
      canvasRef.current = canvas
    }
  }, [canvas, canvasRef])

  useKeyboard({
    onDelete:  deleteSelected,
    onUndo:    undo,
    onRedo:    redo,
    onSave:    onSave ?? saveHistory,
    onZoomIn:  zoomIn,
    onZoomOut: zoomOut,
    onReset:   resetZoom,
  })

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <div className="flex-1 relative overflow-hidden" style={{ background: '#0D0F12' }}>

        <canvas id="civilos-canvas" className="absolute inset-0" />

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
  door:      'Door — click to place',
  window:    'Window — click to place',
  column:    'Column — click to place',
  room:      'Room — draw boundary',
  grid:      'Grid Line — click to add',
  dimension: 'Dimension — click two points',
  text:      'Text — click to add',
  line:      'Line — click start, click end',
  polyline:  'Polyline — click points, dbl-click to finish',
  circle:    'Circle — click center, drag radius',
  rectangle: 'Rectangle — click and drag',
  eraser:    'Eraser — click object to delete',
}
