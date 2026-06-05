import { useAppStore } from '@/store/useAppStore'
import { Eye, EyeOff, Lock, Unlock, Layers, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

export default function LayerPanel() {
  const {
    layers, activeLayerId,
    setActiveLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    floors, activeFloorId, setActiveFloor,
    leftPanelOpen,
  } = useAppStore()

  const [floorOpen, setFloorOpen] = useState(true)
  const [layerOpen, setLayerOpen] = useState(true)

  if (!leftPanelOpen) return null

  return (
    <div
      className="panel flex flex-col h-full bg-panel-bg border-r border-panel-border"
      style={{ width: '200px', minWidth: '200px' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 border-b border-panel-border"
        style={{ height: '44px' }}>
        <Layers size={14} className="text-accent-primary" />
        <span className="text-xs font-display font-semibold text-text-primary">
          Layers
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── Floor Section ─────────────────────── */}
        <SectionHeader
          label="Floors"
          open={floorOpen}
          onToggle={() => setFloorOpen(!floorOpen)}
        />
        {floorOpen && (
          <div className="py-1">
            {floors.map((floor) => (
              <button
                key={floor.id}
                onClick={() => setActiveFloor(floor.id)}
                className={`
                  w-full text-left px-3 py-2 flex items-center gap-2
                  text-xs transition-colors duration-100
                  ${floor.id === activeFloorId
                    ? 'bg-panel-active text-accent-primary border-l-2 border-accent-primary'
                    : 'text-text-secondary hover:bg-panel-hover hover:text-text-primary border-l-2 border-transparent'
                  }
                `}
              >
                <span className="font-mono text-2xs text-text-muted w-10 shrink-0">
                  +{floor.level / 1000}m
                </span>
                <span className="truncate font-display font-medium">
                  {floor.name}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="divider" />

        {/* ── Layer Section ──────────────────────── */}
        <SectionHeader
          label="Object Layers"
          open={layerOpen}
          onToggle={() => setLayerOpen(!layerOpen)}
        />
        {layerOpen && (
          <div className="py-1">
            {layers.map((layer) => (
              <div
                key={layer.id}
                onClick={() => setActiveLayer(layer.id)}
                className={`
                  flex items-center gap-1.5 px-2 py-1.5 cursor-pointer
                  transition-colors duration-100 group
                  ${layer.id === activeLayerId
                    ? 'bg-panel-active'
                    : 'hover:bg-panel-hover'
                  }
                `}
              >
                {/* Color swatch */}
                <div
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: layer.color }}
                />

                {/* Layer name */}
                <span
                  className={`
                    flex-1 text-xs truncate font-display
                    ${layer.id === activeLayerId
                      ? 'text-text-primary font-medium'
                      : 'text-text-secondary'
                    }
                    ${!layer.visible ? 'opacity-40' : ''}
                  `}
                >
                  {layer.name}
                </span>

                {/* Controls */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Visibility */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleLayerVisibility(layer.id)
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded
                               text-text-muted hover:text-text-primary transition-colors"
                    title={layer.visible ? 'Hide' : 'Show'}
                  >
                    {layer.visible
                      ? <Eye     size={11} />
                      : <EyeOff  size={11} className="text-accent-error" />
                    }
                  </button>

                  {/* Lock */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleLayerLock(layer.id)
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded
                               text-text-muted hover:text-text-primary transition-colors"
                    title={layer.locked ? 'Unlock' : 'Lock'}
                  >
                    {layer.locked
                      ? <Lock   size={11} className="text-accent-warning" />
                      : <Unlock size={11} />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer — active layer indicator */}
      <div className="border-t border-panel-border px-3 py-2 flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-sm"
          style={{
            background: layers.find((l) => l.id === activeLayerId)?.color ?? '#64748B'
          }}
        />
        <span className="text-2xs text-text-muted truncate font-display">
          {layers.find((l) => l.id === activeLayerId)?.name ?? '—'}
        </span>
      </div>
    </div>
  )
}

// ─── Section Header ───────────────────────────────────
function SectionHeader({
  label, open, onToggle
}: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2
                 hover:bg-panel-hover transition-colors"
    >
      <span className="section-label px-0 py-0 text-text-muted">{label}</span>
      {open
        ? <ChevronUp   size={12} className="text-text-muted" />
        : <ChevronDown size={12} className="text-text-muted" />
      }
    </button>
  )
}
