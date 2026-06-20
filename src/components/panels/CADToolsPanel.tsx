import { useState } from 'react'
import type { useCADTools } from '@/hooks/useCADTools'
import type { HatchPattern } from '@/lib/cadTools'
import {
  FlipHorizontal, FlipVertical, Copy, Move,
  RotateCw, Maximize2, Grid3x3, Layers,
  ChevronDown, ChevronUp, Trash2,
  ChevronsUp, ChevronsDown, ArrowUp, ArrowDown,
  Group, Ungroup, Hash,
} from 'lucide-react'

type CADHook = ReturnType<typeof useCADTools>

interface CADToolsPanelProps {
  hook: CADHook
}

export default function CADToolsPanel({ hook }: CADToolsPanelProps) {
  const {
    moveStep, setMoveStep,
    rotateAngle, setRotateAngle,
    scaleFactor, setScaleFactor,
    offsetDist, setOffsetDist,
    arrayRows, setArrayRows,
    arrayCols, setArrayCols,
    arrayRowGap, setArrayRowGap,
    arrayColGap, setArrayColGap,
    mirror, copyOffset, move, rotate, scale,
    offset, createArray, applyHatch,
    deleteSelected, selectAllObjects, duplicate,
    bringForward, sendBackward, bringToFront, sendToBack,
    groupSelected, ungroupSelected,
  } = hook

  const [transformOpen, setTransformOpen] = useState(true)
  const [arrayOpen,     setArrayOpen]     = useState(false)
  const [hatchOpen,     setHatchOpen]     = useState(false)
  const [orderOpen,     setOrderOpen]     = useState(false)

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Quick Actions ──────────────────────────── */}
      <div className="px-2 py-2 border-b border-panel-border">
        <div className="grid grid-cols-3 gap-1">
          <ActionBtn icon={<Copy size={13} />}    label="Duplicate" onClick={duplicate} />
          <ActionBtn icon={<Trash2 size={13} />}  label="Delete"    onClick={deleteSelected} danger />
          <ActionBtn icon={<Hash size={13} />}    label="Select All" onClick={selectAllObjects} />
        </div>
      </div>

      {/* ── Transform ─────────────────────────────── */}
      <SectionHead label="Transform" open={transformOpen} onToggle={() => setTransformOpen(!transformOpen)} />
      {transformOpen && (
        <div className="px-2 pb-2 flex flex-col gap-2">

          {/* Mirror */}
          <div>
            <p className="text-2xs text-text-muted mb-1 px-1">Mirror</p>
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => mirror('horizontal')}
                className="cad-btn flex items-center gap-1.5 justify-center">
                <FlipHorizontal size={12} />
                <span>Horizontal</span>
              </button>
              <button onClick={() => mirror('vertical')}
                className="cad-btn flex items-center gap-1.5 justify-center">
                <FlipVertical size={12} />
                <span>Vertical</span>
              </button>
              <button onClick={() => mirror('horizontal', true)}
                className="cad-btn col-span-2 flex items-center gap-1.5 justify-center text-text-muted">
                <Copy size={11} />
                <span>Mirror Copy</span>
              </button>
            </div>
          </div>

          {/* Move */}
          <div>
            <div className="flex items-center justify-between mb-1 px-1">
              <p className="text-2xs text-text-muted">Move Step</p>
              <div className="flex items-center gap-1">
                <input type="number" className="cad-input w-16 text-right"
                  value={moveStep} min={1} step={100}
                  onChange={(e) => setMoveStep(Number(e.target.value))} />
                <span className="text-2xs text-text-muted">mm</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <button onClick={() => move(-moveStep, 0)}  className="cad-btn">← Left</button>
              <button onClick={() => move(0, -moveStep)}  className="cad-btn">↑ Up</button>
              <button onClick={() => move(moveStep, 0)}   className="cad-btn">Right →</button>
              <div />
              <button onClick={() => move(0, moveStep)}   className="cad-btn">↓ Down</button>
              <div />
            </div>
          </div>

          {/* Rotate */}
          <div>
            <div className="flex items-center justify-between mb-1 px-1">
              <p className="text-2xs text-text-muted">Rotate</p>
              <div className="flex items-center gap-1">
                <input type="number" className="cad-input w-16 text-right"
                  value={rotateAngle} min={1} max={360} step={15}
                  onChange={(e) => setRotateAngle(Number(e.target.value))} />
                <span className="text-2xs text-text-muted">°</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => rotate(rotateAngle)}
                className="cad-btn flex items-center gap-1 justify-center">
                <RotateCw size={11} /> CW
              </button>
              <button onClick={() => rotate(-rotateAngle)}
                className="cad-btn flex items-center gap-1 justify-center">
                <RotateCw size={11} className="scale-x-[-1]" /> CCW
              </button>
            </div>
          </div>

          {/* Scale */}
          <div>
            <div className="flex items-center justify-between mb-1 px-1">
              <p className="text-2xs text-text-muted">Scale Factor</p>
              <div className="flex items-center gap-1">
                <input type="number" className="cad-input w-16 text-right"
                  value={scaleFactor} min={0.1} max={10} step={0.1}
                  onChange={(e) => setScaleFactor(Number(e.target.value))} />
                <span className="text-2xs text-text-muted">×</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => scale(scaleFactor)}
                className="cad-btn flex items-center gap-1 justify-center">
                <Maximize2 size={11} /> Enlarge
              </button>
              <button onClick={() => scale(1 / scaleFactor)}
                className="cad-btn flex items-center gap-1 justify-center">
                <Maximize2 size={11} className="scale-75" /> Shrink
              </button>
            </div>
          </div>

          {/* Offset */}
          <div>
            <div className="flex items-center justify-between mb-1 px-1">
              <p className="text-2xs text-text-muted">Offset Distance</p>
              <div className="flex items-center gap-1">
                <input type="number" className="cad-input w-16 text-right"
                  value={offsetDist} min={1} step={50}
                  onChange={(e) => setOffsetDist(Number(e.target.value))} />
                <span className="text-2xs text-text-muted">mm</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => offset(offsetDist)}  className="cad-btn">Offset +</button>
              <button onClick={() => offset(-offsetDist)} className="cad-btn">Offset −</button>
            </div>
          </div>

          {/* Group */}
          <div>
            <p className="text-2xs text-text-muted mb-1 px-1">Group</p>
            <div className="grid grid-cols-2 gap-1">
              <button onClick={groupSelected}
                className="cad-btn flex items-center gap-1 justify-center">
                <Group size={11} /> Group
              </button>
              <button onClick={ungroupSelected}
                className="cad-btn flex items-center gap-1 justify-center">
                <Ungroup size={11} /> Ungroup
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="divider" />

      {/* ── Rectangular Array ─────────────────────── */}
      <SectionHead label="Array" open={arrayOpen} onToggle={() => setArrayOpen(!arrayOpen)} />
      {arrayOpen && (
        <div className="px-2 pb-2 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-2xs text-text-muted mb-1">Columns</p>
              <input type="number" className="cad-input w-full"
                value={arrayCols} min={1} max={20}
                onChange={(e) => setArrayCols(Number(e.target.value))} />
            </div>
            <div>
              <p className="text-2xs text-text-muted mb-1">Rows</p>
              <input type="number" className="cad-input w-full"
                value={arrayRows} min={1} max={20}
                onChange={(e) => setArrayRows(Number(e.target.value))} />
            </div>
            <div>
              <p className="text-2xs text-text-muted mb-1">Col Gap (mm)</p>
              <input type="number" className="cad-input w-full"
                value={arrayColGap} min={100} step={500}
                onChange={(e) => setArrayColGap(Number(e.target.value))} />
            </div>
            <div>
              <p className="text-2xs text-text-muted mb-1">Row Gap (mm)</p>
              <input type="number" className="cad-input w-full"
                value={arrayRowGap} min={100} step={500}
                onChange={(e) => setArrayRowGap(Number(e.target.value))} />
            </div>
          </div>
          <button onClick={createArray}
            className="w-full py-2 rounded border border-accent-primary/40
                       text-accent-primary text-xs flex items-center justify-center gap-2
                       hover:bg-accent-primary/10 transition-colors">
            <Grid3x3 size={12} />
            Create {arrayCols}×{arrayRows} Array
          </button>
        </div>
      )}

      <div className="divider" />

      {/* ── Hatch Patterns ────────────────────────── */}
      <SectionHead label="Hatch" open={hatchOpen} onToggle={() => setHatchOpen(!hatchOpen)} />
      {hatchOpen && (
        <div className="px-2 pb-2">
          <p className="text-2xs text-text-muted mb-2 px-1">
            Select an object, then click pattern
          </p>
          <div className="grid grid-cols-2 gap-1">
            {HATCH_PRESETS.map((h) => (
              <button key={h.key}
                onClick={() => applyHatch(h.key as HatchPattern, h.color, h.spacing)}
                className="cad-btn text-left flex flex-col gap-0.5">
                <span className="text-2xs font-semibold text-text-primary">{h.label}</span>
                <span className="text-2xs text-text-muted">{h.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="divider" />

      {/* ── Object Order ──────────────────────────── */}
      <SectionHead label="Layer Order" open={orderOpen} onToggle={() => setOrderOpen(!orderOpen)} />
      {orderOpen && (
        <div className="px-2 pb-2">
          <div className="grid grid-cols-2 gap-1">
            <button onClick={bringToFront}
              className="cad-btn flex items-center gap-1 justify-center">
              <ChevronsUp size={11} /> Front
            </button>
            <button onClick={sendToBack}
              className="cad-btn flex items-center gap-1 justify-center">
              <ChevronsDown size={11} /> Back
            </button>
            <button onClick={bringForward}
              className="cad-btn flex items-center gap-1 justify-center">
              <ArrowUp size={11} /> Forward
            </button>
            <button onClick={sendBackward}
              className="cad-btn flex items-center gap-1 justify-center">
              <ArrowDown size={11} /> Backward
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────

function SectionHead({ label, open, onToggle }: {
  label: string; open: boolean; onToggle: () => void
}) {
  return (
    <button onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2
                 hover:bg-panel-hover transition-colors">
      <span className="section-label px-0 py-0 text-text-muted">{label}</span>
      {open ? <ChevronUp size={11} className="text-text-muted" />
            : <ChevronDown size={11} className="text-text-muted" />}
    </button>
  )
}

function ActionBtn({ icon, label, onClick, danger = false }: {
  icon: React.ReactNode; label: string
  onClick: () => void; danger?: boolean
}) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-1 py-2 px-1 rounded border
                  text-2xs transition-colors
                  ${danger
                    ? 'border-accent-error/30 text-accent-error hover:bg-accent-error/10'
                    : 'border-panel-border text-text-muted hover:text-text-primary hover:bg-panel-hover'
                  }`}>
      {icon}
      <span className="leading-none">{label}</span>
    </button>
  )
}

const HATCH_PRESETS = [
  { key: 'horizontal', label: 'Horizontal', desc: 'H lines',  color: '#64748B', spacing: 20 },
  { key: 'diagonal45', label: 'Diagonal',   desc: '45° lines',color: '#64748B', spacing: 20 },
  { key: 'crosshatch', label: 'Crosshatch', desc: 'Grid',     color: '#64748B', spacing: 20 },
  { key: 'concrete',   label: 'Concrete',   desc: 'RCC',      color: '#94A3B8', spacing: 24 },
  { key: 'brick',      label: 'Brick',      desc: 'Masonry',  color: '#78716C', spacing: 24 },
  { key: 'earth',      label: 'Earth',      desc: 'Soil',     color: '#92400E', spacing: 16 },
  { key: 'dots',       label: 'Dots',       desc: 'Point',    color: '#64748B', spacing: 16 },
  { key: 'vertical',   label: 'Vertical',   desc: 'V lines',  color: '#64748B', spacing: 20 },
]
