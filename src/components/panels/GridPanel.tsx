import { useState } from 'react'
import type { useGridSystem } from '@/hooks/useGridSystem'
import type { GridLine } from '@/lib/gridSystem'
import {
  Grid3x3, Plus, Trash2, Lock, Unlock,
  Eye, EyeOff, Download, Save,
  ChevronDown, ChevronUp, Zap,
  ArrowRight, RotateCcw
} from 'lucide-react'

type GridHook = ReturnType<typeof useGridSystem>

interface GridPanelProps {
  hook: GridHook
}

export default function GridPanel({ hook }: GridPanelProps) {
  const {
    system, settings, hasGrid, saving,
    generateGrid, addXLine, addYLine,
    updateLinePosition, updateLineLabel,
    removeLine, toggleLock,
    updateSettings, toggleVisibility,
    clearGrid, saveGrid, exportToStructural,
  } = hook

  // ── Generate form state ────────────────────────────
  const [genOpen,     setGenOpen]     = useState(true)
  const [linesOpen,   setLinesOpen]   = useState(true)
  const [settingsOpen,setSettingsOpen]= useState(false)

  const [cols,       setCols]       = useState(5)
  const [rows,       setRows]       = useState(4)
  const [colSpacing, setColSpacing] = useState(5000)
  const [rowSpacing, setRowSpacing] = useState(4000)

  const [newXPos, setNewXPos] = useState('')
  const [newYPos, setNewYPos] = useState('')

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-panel-border shrink-0">
        <div className="flex items-center gap-2">
          <Grid3x3 size={14} className="text-accent-primary" />
          <span className="text-xs font-display font-semibold text-text-primary">
            Structural Grid
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Visibility */}
          <button onClick={toggleVisibility}
            className={`toolbar-btn w-6 h-6 ${settings.visible ? 'text-accent-primary' : 'text-text-muted'}`}
            title="Toggle visibility">
            {settings.visible ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          {/* Save */}
          <button onClick={saveGrid}
            disabled={!hasGrid || saving}
            className="toolbar-btn w-6 h-6 disabled:opacity-40"
            title="Save grid">
            <Save size={12} />
          </button>
        </div>
      </div>

      {/* ── Generate Section ──────────────────────── */}
      <SectionHead label="Generate Grid" open={genOpen} onToggle={() => setGenOpen(!genOpen)} />
      {genOpen && (
        <div className="px-3 pb-3 flex flex-col gap-2">

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-2xs text-text-muted mb-1">Columns (X)</p>
              <input type="number" className="cad-input w-full"
                value={cols} min={1} max={26}
                onChange={(e) => setCols(Number(e.target.value))} />
            </div>
            <div>
              <p className="text-2xs text-text-muted mb-1">Rows (Y)</p>
              <input type="number" className="cad-input w-full"
                value={rows} min={1} max={26}
                onChange={(e) => setRows(Number(e.target.value))} />
            </div>
            <div>
              <p className="text-2xs text-text-muted mb-1">Col Spacing (mm)</p>
              <input type="number" className="cad-input w-full"
                value={colSpacing} step={500}
                onChange={(e) => setColSpacing(Number(e.target.value))} />
            </div>
            <div>
              <p className="text-2xs text-text-muted mb-1">Row Spacing (mm)</p>
              <input type="number" className="cad-input w-full"
                value={rowSpacing} step={500}
                onChange={(e) => setRowSpacing(Number(e.target.value))} />
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <p className="text-2xs text-text-muted mb-1.5">Quick Presets</p>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <button key={p.label}
                  onClick={() => {
                    setCols(p.cols); setRows(p.rows)
                    setColSpacing(p.colSpacing); setRowSpacing(p.rowSpacing)
                  }}
                  className="text-2xs px-2 py-1 rounded border border-panel-border
                             text-text-muted hover:text-accent-primary hover:border-accent-primary/40
                             transition-colors font-mono">
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => generateGrid(cols, rows, colSpacing, rowSpacing)}
            className="w-full py-2 rounded-lg flex items-center justify-center gap-2
                       text-xs font-display font-semibold text-text-inverse transition-all
                       hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg,#00B4D8,#0077A8)' }}
          >
            <Zap size={13} />
            Generate Grid
          </button>

          {hasGrid && (
            <button onClick={clearGrid}
              className="w-full py-1.5 rounded border border-accent-error/30
                         text-accent-error text-xs flex items-center justify-center gap-1.5
                         hover:bg-accent-error/10 transition-colors">
              <RotateCcw size={11} />
              Clear Grid
            </button>
          )}
        </div>
      )}

      <div className="divider" />

      {/* ── Grid Lines Section ────────────────────── */}
      {hasGrid && (
        <>
          <SectionHead label="Grid Lines" open={linesOpen} onToggle={() => setLinesOpen(!linesOpen)} />
          {linesOpen && (
            <div className="px-2 pb-2">

              {/* X Lines (Vertical / Numbered) */}
              <div className="mb-2">
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-2xs font-mono text-text-muted uppercase tracking-wider">
                    X Lines (1,2,3...)
                  </span>
                  <span className="text-2xs text-accent-primary font-mono">
                    {system.xLines.length}
                  </span>
                </div>
                {system.xLines.map((line) => (
                  <GridLineRow
                    key={line.id}
                    line={line}
                    onUpdatePos={(v) => updateLinePosition(line.id, 'x', v)}
                    onUpdateLabel={(v) => updateLineLabel(line.id, 'x', v)}
                    onRemove={() => removeLine(line.id, 'x')}
                    onToggleLock={() => toggleLock(line.id, 'x')}
                  />
                ))}

                {/* Add X line */}
                <div className="flex gap-1 mt-1">
                  <input
                    className="cad-input flex-1 text-2xs"
                    placeholder="position (mm)"
                    value={newXPos}
                    type="number"
                    onChange={(e) => setNewXPos(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newXPos) {
                        addXLine(Number(newXPos))
                        setNewXPos('')
                      }
                    }}
                  />
                  <button
                    onClick={() => { if (newXPos) { addXLine(Number(newXPos)); setNewXPos('') } }}
                    className="w-7 h-7 flex items-center justify-center rounded
                               bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30">
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              {/* Y Lines (Horizontal / Lettered) */}
              <div>
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-2xs font-mono text-text-muted uppercase tracking-wider">
                    Y Lines (A,B,C...)
                  </span>
                  <span className="text-2xs text-accent-primary font-mono">
                    {system.yLines.length}
                  </span>
                </div>
                {system.yLines.map((line) => (
                  <GridLineRow
                    key={line.id}
                    line={line}
                    onUpdatePos={(v) => updateLinePosition(line.id, 'y', v)}
                    onUpdateLabel={(v) => updateLineLabel(line.id, 'y', v)}
                    onRemove={() => removeLine(line.id, 'y')}
                    onToggleLock={() => toggleLock(line.id, 'y')}
                  />
                ))}

                <div className="flex gap-1 mt-1">
                  <input
                    className="cad-input flex-1 text-2xs"
                    placeholder="position (mm)"
                    value={newYPos}
                    type="number"
                    onChange={(e) => setNewYPos(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newYPos) {
                        addYLine(Number(newYPos))
                        setNewYPos('')
                      }
                    }}
                  />
                  <button
                    onClick={() => { if (newYPos) { addYLine(Number(newYPos)); setNewYPos('') } }}
                    className="w-7 h-7 flex items-center justify-center rounded
                               bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30">
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="divider" />

          {/* ── Settings ──────────────────────────── */}
          <SectionHead label="Display" open={settingsOpen} onToggle={() => setSettingsOpen(!settingsOpen)} />
          {settingsOpen && (
            <div className="px-3 pb-3 flex flex-col gap-2">
              <ToggleRow
                label="Show Bubbles"
                value={settings.showBubbles}
                onChange={(v) => updateSettings({ showBubbles: v })}
              />
              <ToggleRow
                label="Show Dimensions"
                value={settings.showDimensions}
                onChange={(v) => updateSettings({ showDimensions: v })}
              />
              <ToggleRow
                label="Lock Grid"
                value={settings.locked}
                onChange={(v) => updateSettings({ locked: v })}
              />
            </div>
          )}

          <div className="divider" />

          {/* ── Export ────────────────────────────── */}
          <div className="px-3 py-3">
            <p className="text-2xs text-text-muted mb-2 font-bengali">
              Structural App-এ এই grid data পাঠাবে
            </p>
            <button
              onClick={() => exportToStructural()}
              className="w-full py-2 rounded-lg flex items-center justify-center gap-2
                         border border-accent-primary/40 text-accent-primary text-xs
                         hover:bg-accent-primary/10 transition-colors font-display font-semibold"
            >
              <Download size={13} />
              Export to Structural App
              <ArrowRight size={11} />
            </button>
            <p className="text-2xs text-text-muted mt-1.5 text-center font-mono">
              JSON + Firestore sync
            </p>
          </div>
        </>
      )}

      {/* Empty state */}
      {!hasGrid && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center py-8">
          <Grid3x3 size={28} className="text-text-muted opacity-20 mb-3" />
          <p className="text-xs text-text-muted font-bengali leading-relaxed">
            উপরে Generate করুন অথবা
            Canvas-এ G key চেপে grid line যোগ করুন
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Grid Line Row ────────────────────────────────────
function GridLineRow({ line, onUpdatePos, onUpdateLabel, onRemove, onToggleLock }: {
  line:          GridLine
  onUpdatePos:   (v: number) => void
  onUpdateLabel: (v: string) => void
  onRemove:      () => void
  onToggleLock:  () => void
}) {
  const [editPos,   setEditPos]   = useState(false)
  const [editLabel, setEditLabel] = useState(false)
  const [posVal,    setPosVal]    = useState(String(line.position))
  const [lblVal,    setLblVal]    = useState(line.label)

  return (
    <div className="flex items-center gap-1 py-0.5 group">

      {/* Label */}
      {editLabel ? (
        <input
          className="cad-input w-8 text-center text-2xs"
          value={lblVal}
          autoFocus
          onChange={(e) => setLblVal(e.target.value)}
          onBlur={() => { onUpdateLabel(lblVal); setEditLabel(false) }}
          onKeyDown={(e) => { if (e.key === 'Enter') { onUpdateLabel(lblVal); setEditLabel(false) } }}
        />
      ) : (
        <button
          onClick={() => setEditLabel(true)}
          className="w-8 h-5 flex items-center justify-center rounded text-2xs
                     font-mono font-bold text-accent-primary border border-accent-primary/30
                     hover:border-accent-primary transition-colors">
          {line.label}
        </button>
      )}

      {/* Position */}
      {editPos ? (
        <input
          className="cad-input flex-1 text-2xs"
          value={posVal}
          type="number"
          autoFocus
          onChange={(e) => setPosVal(e.target.value)}
          onBlur={() => { onUpdatePos(Number(posVal)); setEditPos(false) }}
          onKeyDown={(e) => { if (e.key === 'Enter') { onUpdatePos(Number(posVal)); setEditPos(false) } }}
        />
      ) : (
        <button
          onClick={() => setEditPos(true)}
          className="flex-1 text-left text-2xs font-mono text-text-muted
                     hover:text-text-primary transition-colors px-1 truncate">
          {line.position >= 1000
            ? `${(line.position / 1000).toFixed(2)}m`
            : `${line.position}mm`}
        </button>
      )}

      {/* Controls */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onToggleLock}
          className={`w-5 h-5 flex items-center justify-center rounded transition-colors
            ${line.locked ? 'text-accent-warning' : 'text-text-muted hover:text-text-primary'}`}>
          {line.locked ? <Lock size={9} /> : <Unlock size={9} />}
        </button>
        <button onClick={onRemove}
          className="w-5 h-5 flex items-center justify-center rounded
                     text-accent-error/50 hover:text-accent-error transition-colors">
          <Trash2 size={9} />
        </button>
      </div>
    </div>
  )
}

// ─── Toggle Row ───────────────────────────────────────
function ToggleRow({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-secondary">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-8 h-4 rounded-full transition-colors duration-200
          ${value ? 'bg-accent-primary' : 'bg-panel-border'}`}>
        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white
          transition-transform duration-200
          ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

// ─── Section Header ───────────────────────────────────
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

// ─── Grid Presets ─────────────────────────────────────
const PRESETS = [
  { label: '4×3',  cols: 4,  rows: 3,  colSpacing: 5000, rowSpacing: 4000 },
  { label: '5×4',  cols: 5,  rows: 4,  colSpacing: 5000, rowSpacing: 4000 },
  { label: '6×5',  cols: 6,  rows: 5,  colSpacing: 4500, rowSpacing: 4000 },
  { label: '3×3m', cols: 3,  rows: 3,  colSpacing: 3000, rowSpacing: 3000 },
  { label: '6m',   cols: 5,  rows: 4,  colSpacing: 6000, rowSpacing: 6000 },
]
