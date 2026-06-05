import { useAppStore } from '@/store/useAppStore'
import { RotateCcw, RotateCw, Magnet, Grid3x3 } from 'lucide-react'
import { formatMm } from '@/lib/canvasUtils'

interface StatusBarProps {
  x:           number
  y:           number
  zoom:        number
  tool:        string
  projectName: string
  onUndo:      () => void
  onRedo:      () => void
}

export default function StatusBar({
  x, y, zoom, tool, projectName,
  onUndo, onRedo,
}: StatusBarProps) {
  const { showGrid, toggleGrid, snapMode, setSnapMode } = useAppStore()

  const snapCycle = () => {
    const next: Record<string, any> = {
      grid: 'endpoint', endpoint: 'none', none: 'grid'
    }
    setSnapMode(next[snapMode] ?? 'grid')
  }

  return (
    <div className="status-bar select-none">

      {/* Coordinates */}
      <span className="text-text-secondary">
        X: <span className="text-accent-primary">{formatMm(x)}</span>
      </span>
      <span className="text-text-secondary">
        Y: <span className="text-accent-primary">{formatMm(y)}</span>
      </span>

      <Divider />

      {/* Zoom */}
      <span>Zoom: <span className="text-text-secondary">{Math.round(zoom * 100)}%</span></span>

      <Divider />

      {/* Active Tool */}
      <span className="text-accent-primary uppercase">{tool}</span>

      <Divider />

      {/* Grid toggle */}
      <button
        onClick={toggleGrid}
        className={`flex items-center gap-1 hover:text-text-primary transition-colors ${
          showGrid ? 'text-accent-primary' : 'text-text-muted'
        }`}
        title="Toggle Grid (')"
      >
        <Grid3x3 size={10} />
        <span>Grid</span>
      </button>

      {/* Snap indicator */}
      <button
        onClick={snapCycle}
        className={`flex items-center gap-1 hover:text-text-primary transition-colors ${
          snapMode !== 'none' ? 'text-accent-primary' : 'text-text-muted'
        }`}
        title="Cycle Snap Mode (S)"
      >
        <Magnet size={10} />
        <span>{snapMode}</span>
      </button>

      <Divider />

      {/* Undo / Redo */}
      <button
        onClick={onUndo}
        className="hover:text-text-primary transition-colors"
        title="Undo (Ctrl+Z)"
      >
        <RotateCcw size={10} />
      </button>
      <button
        onClick={onRedo}
        className="hover:text-text-primary transition-colors"
        title="Redo (Ctrl+Y)"
      >
        <RotateCw size={10} />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Project Name */}
      <span className="text-text-muted truncate max-w-32">{projectName}</span>

      <Divider />

      {/* Version */}
      <span className="text-text-muted opacity-50">CivilOS v1.0</span>
    </div>
  )
}

function Divider() {
  return <span className="w-px h-3 bg-panel-border" />
}
