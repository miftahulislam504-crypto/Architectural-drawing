import { useAppStore } from '@/store/useAppStore'
import {
  Settings, Grid3x3, Magnet, Eye,
  ChevronDown, ChevronUp
} from 'lucide-react'
import { useState } from 'react'

export default function PropertiesPanel() {
  const {
    rightPanelOpen,
    gridSize, setGridSize,
    showGrid, toggleGrid,
    snapMode, setSnapMode,
    unit, setUnit,
    bnbcSettings, siteInfo, buildingInfo,
  } = useAppStore()

  const [canvasOpen,  setCanvasOpen]  = useState(true)
  const [projectOpen, setProjectOpen] = useState(true)

  if (!rightPanelOpen) return null

  return (
    <div
      className="panel panel-right flex flex-col h-full bg-panel-bg border-l border-panel-border overflow-y-auto"
      style={{ width: '200px', minWidth: '200px' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 border-b border-panel-border"
        style={{ height: '44px' }}>
        <Settings size={14} className="text-accent-primary" />
        <span className="text-xs font-display font-semibold text-text-primary">
          Properties
        </span>
      </div>

      {/* ── Canvas Settings ────────────────────── */}
      <SectionHeader
        label="Canvas"
        open={canvasOpen}
        onToggle={() => setCanvasOpen(!canvasOpen)}
      />
      {canvasOpen && (
        <div className="px-3 pb-3 flex flex-col gap-3">

          {/* Unit */}
          <div>
            <label className="text-2xs text-text-muted font-mono block mb-1">
              UNIT
            </label>
            <div className="flex gap-1">
              {(['mm', 'm'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={`
                    flex-1 py-1 rounded text-xs font-mono border transition-colors
                    ${unit === u
                      ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                      : 'border-panel-border text-text-muted hover:text-text-secondary'
                    }
                  `}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Grid size */}
          <div>
            <label className="text-2xs text-text-muted font-mono block mb-1">
              GRID SIZE (mm)
            </label>
            <select
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="cad-input"
            >
              {[50, 100, 200, 250, 500, 1000].map((v) => (
                <option key={v} value={v}>
                  {v >= 1000 ? `${v / 1000}m` : `${v}mm`}
                </option>
              ))}
            </select>
          </div>

          {/* Show grid */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Grid3x3 size={12} className="text-text-muted" />
              <span className="text-xs text-text-secondary">Show Grid</span>
            </div>
            <Toggle value={showGrid} onChange={toggleGrid} />
          </div>

          {/* Snap mode */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Magnet size={12} className="text-text-muted" />
              <span className="text-2xs text-text-muted font-mono">SNAP MODE</span>
            </div>
            <div className="flex flex-col gap-1">
              {(['grid', 'endpoint', 'none'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSnapMode(mode)}
                  className={`
                    text-left px-2 py-1 rounded text-xs border transition-colors
                    ${snapMode === mode
                      ? 'border-accent-primary/50 text-accent-primary bg-accent-primary/10'
                      : 'border-transparent text-text-muted hover:text-text-secondary hover:bg-panel-hover'
                    }
                  `}
                >
                  {mode === 'grid'     && '⊞ Grid Snap'}
                  {mode === 'endpoint' && '◎ Endpoint Snap'}
                  {mode === 'none'     && '✕ No Snap'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="divider" />

      {/* ── Project Info (from Hub) ────────────── */}
      <SectionHeader
        label="Project Info"
        open={projectOpen}
        onToggle={() => setProjectOpen(!projectOpen)}
      />
      {projectOpen && (
        <div className="px-3 pb-3 flex flex-col gap-2">

          {siteInfo && (
            <>
              <InfoRow label="Plot Area"  value={`${siteInfo.plotArea} m²`} />
              <InfoRow label="Plot"       value={`${siteInfo.plotWidth}×${siteInfo.plotDepth}m`} />
              <InfoRow label="Road"       value={`${siteInfo.roadWidth}m wide`} />
              <InfoRow label="Soil"       value={`BNBC ${siteInfo.soilType}`} />
            </>
          )}

          {bnbcSettings && (
            <>
              <div className="divider" />
              <InfoRow label="Seismic"    value={`Zone ${bnbcSettings.seismicZone}`} />
              <InfoRow label="Occupancy"  value={`Type ${bnbcSettings.occupancyType}`} />
              <InfoRow label="Wind Zone"  value={`Zone ${bnbcSettings.windZone}`} />
            </>
          )}

          {buildingInfo && (
            <>
              <div className="divider" />
              <InfoRow label="Type"    value={buildingInfo.buildingType} />
              <InfoRow label="Floors"  value={`${buildingInfo.totalFloors}F`} />
              <InfoRow label="Height"  value={`${buildingInfo.totalHeight}m`} />
            </>
          )}

          {!siteInfo && !bnbcSettings && !buildingInfo && (
            <p className="text-2xs text-text-muted text-center py-2 font-bengali">
              Hub থেকে Project data load হলে এখানে দেখাবে
            </p>
          )}
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="mt-auto border-t border-panel-border px-3 py-2">
        <p className="text-2xs text-text-muted font-mono mb-1.5">SHORTCUTS</p>
        <div className="flex flex-col gap-0.5">
          {[
            ["V", "Select"],
            ["W", "Wall"],
            ["D", "Door"],
            ["C", "Column"],
            ["ESC", "Cancel"],
            ["Del", "Delete"],
            ["Ctrl+Z", "Undo"],
            ["0", "Reset zoom"],
          ].map(([key, action]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="badge">{key}</span>
              <span className="text-2xs text-text-muted">{action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Info Row ─────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-2xs text-text-muted shrink-0">{label}</span>
      <span className="text-2xs text-text-secondary font-mono text-right truncate">{value}</span>
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`
        relative w-8 h-4 rounded-full transition-colors duration-200
        ${value ? 'bg-accent-primary' : 'bg-panel-border'}
      `}
    >
      <div
        className={`
          absolute top-0.5 w-3 h-3 rounded-full bg-white
          transition-transform duration-200
          ${value ? 'translate-x-4' : 'translate-x-0.5'}
        `}
      />
    </button>
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
