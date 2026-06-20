import { useState, useCallback } from 'react'
import { fabric } from 'fabric'
import {
  autoTagCanvas, removeAutoTags,
  createCallout, createLeader,
  createRoomTag, createDoorTag,
  createWindowTag, createColumnTag,
  createDimChain, DIM_STYLES,
} from '@/lib/annotationEngine'
import { toast } from '@/components/ui/Toast'
import {
  Tag, Zap, Trash2, MessageSquare,
  ChevronDown, ChevronUp,
  AlignLeft, Layers, Link,
  BarChart2, Info,
} from 'lucide-react'

interface AnnotationPanelProps {
  canvas: fabric.Canvas | null
}

export default function AnnotationPanel({ canvas }: AnnotationPanelProps) {
  const [autoOpen,    setAutoOpen]    = useState(true)
  const [manualOpen,  setManualOpen]  = useState(false)
  const [dimOpen,     setDimOpen]     = useState(false)
  const [calloutOpen, setCalloutOpen] = useState(false)
  const [hasAutoTags, setHasAutoTags] = useState(false)

  // ── Auto-tag all BIM objects ──────────────────────
  const handleAutoTag = useCallback(() => {
    if (!canvas) return
    removeAutoTags(canvas)
    autoTagCanvas(canvas)
    setHasAutoTags(true)
    const count = canvas.getObjects().filter((o: any) => o.__autoTag).length
    toast.success(`${count} auto-tag(s) added`)
  }, [canvas])

  const handleClearTags = useCallback(() => {
    if (!canvas) return
    removeAutoTags(canvas)
    setHasAutoTags(false)
    toast.info('All auto-tags removed')
  }, [canvas])

  // ── Add callout ───────────────────────────────────
  const [callTitle, setCallTitle] = useState('Note')
  const [callBody,  setCallBody]  = useState('Description here')

  const addCallout = useCallback(() => {
    if (!canvas) return
    const cx = canvas.getWidth()  / 2
    const cy = canvas.getHeight() / 2
    const box = createCallout(cx - 70, cy - 30, callTitle, callBody)
    canvas.add(box)
    canvas.setActiveObject(box)
    canvas.renderAll()
    toast.success('Callout added')
  }, [canvas, callTitle, callBody])

  // ── Dimension chain ───────────────────────────────
  const [dimDir,    setDimDir]    = useState<'h' | 'v'>('h')
  const [dimOffset, setDimOffset] = useState(30)
  const [dimPoints, setDimPoints] = useState('')

  const addDimChain = useCallback(() => {
    if (!canvas) return
    // Parse points from selected objects
    const objs = canvas.getActiveObjects()
    if (objs.length < 2) {
      toast.warning('Select at least 2 objects')
      return
    }
    const pts = objs.map((o) => {
      const b = o.getBoundingRect()
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 }
    }).sort((a, b) => dimDir === 'h' ? a.x - b.x : a.y - b.y)

    createDimChain(canvas, pts, dimOffset, dimDir === 'h')
    toast.success(`Dimension chain (${objs.length - 1}) added`)
  }, [canvas, dimDir, dimOffset])

  // ── Manual tag helpers ────────────────────────────
  const addManualRoomTag = useCallback(() => {
    if (!canvas) return
    const cx = canvas.getWidth() / 2
    const cy = canvas.getHeight() / 2
    const tag = createRoomTag(cx, cy, 'Room Name', 0, 'R-00')
    canvas.add(tag)
    canvas.setActiveObject(tag)
    canvas.renderAll()
    toast.success('Room tag added')
  }, [canvas])

  const addManualDoorTag = useCallback(() => {
    if (!canvas) return
    const cx = canvas.getWidth() / 2
    const cy = canvas.getHeight() / 2
    const tag = createDoorTag(cx, cy, 'D-00', 900, 2100)
    canvas.add(tag)
    canvas.setActiveObject(tag)
    canvas.renderAll()
    toast.success('Door tag added')
  }, [canvas])

  const addManualWindowTag = useCallback(() => {
    if (!canvas) return
    const cx = canvas.getWidth() / 2
    const cy = canvas.getHeight() / 2
    const tag = createWindowTag(cx, cy, 'W-00', 1200, 900)
    canvas.add(tag)
    canvas.setActiveObject(tag)
    canvas.renderAll()
    toast.success('Window tag added')
  }, [canvas])

  const addManualColumnTag = useCallback(() => {
    if (!canvas) return
    const cx = canvas.getWidth() / 2
    const cy = canvas.getHeight() / 2
    const tag = createColumnTag(cx, cy, 'C-00', 'A-1', '300×300')
    canvas.add(tag)
    canvas.setActiveObject(tag)
    canvas.renderAll()
    toast.success('Column tag added')
  }, [canvas])

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Auto-tag Section ──────────────────────── */}
      <SectionHead
        label="Auto Tags"
        open={autoOpen}
        onToggle={() => setAutoOpen(!autoOpen)}
      />
      {autoOpen && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          <p className="text-2xs text-text-muted leading-relaxed">
            Adds an auto-tag to every BIM object on the canvas — Room, Door, Window, Column, Wall.
          </p>
          <button
            onClick={handleAutoTag}
            className="w-full py-2 rounded-lg flex items-center justify-center gap-2
                       text-xs font-display font-semibold text-text-inverse transition-all
                       hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg,#1a56db,#1e429f)' }}
          >
            <Zap size={13} />
            Auto-Tag All Objects
          </button>

          {hasAutoTags && (
            <button
              onClick={handleClearTags}
              className="w-full py-1.5 rounded border border-accent-error/30
                         text-accent-error text-xs flex items-center justify-center gap-1.5
                         hover:bg-accent-error/10 transition-colors"
            >
              <Trash2 size={11} />
              Clear Auto Tags
            </button>
          )}
        </div>
      )}

      <div className="divider" />

      {/* ── Manual Tags ───────────────────────────── */}
      <SectionHead
        label="Manual Tags"
        open={manualOpen}
        onToggle={() => setManualOpen(!manualOpen)}
      />
      {manualOpen && (
        <div className="px-2 pb-3">
          <p className="text-2xs text-text-muted mb-2 px-1">
            Click to place at canvas center, then drag to reposition
          </p>
          <div className="grid grid-cols-2 gap-1">
            <TagBtn
              label="Room Tag"
              color="#10B981"
              onClick={addManualRoomTag}
            />
            <TagBtn
              label="Door Tag"
              color="#F59E0B"
              onClick={addManualDoorTag}
            />
            <TagBtn
              label="Window Tag"
              color="#00B4D8"
              onClick={addManualWindowTag}
            />
            <TagBtn
              label="Column Tag"
              color="#EF4444"
              onClick={addManualColumnTag}
            />
          </div>
        </div>
      )}

      <div className="divider" />

      {/* ── Dimension Chain ───────────────────────── */}
      <SectionHead
        label="Dim Chain"
        open={dimOpen}
        onToggle={() => setDimOpen(!dimOpen)}
      />
      {dimOpen && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          <p className="text-2xs text-text-muted leading-relaxed">
            Select objects, then add a chain dimension.
          </p>

          <div>
            <p className="text-2xs text-text-muted mb-1">Direction</p>
            <div className="flex gap-1">
              {(['h', 'v'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDimDir(d)}
                  className={`flex-1 py-1 rounded text-xs font-mono border transition-colors
                    ${dimDir === d
                      ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                      : 'border-panel-border text-text-muted hover:text-text-secondary'
                    }`}
                >
                  {d === 'h' ? '← Horizontal →' : '↕ Vertical'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-2xs text-text-muted mb-1">Offset (px)</p>
            <input
              type="number"
              className="cad-input w-full"
              value={dimOffset}
              min={10} max={100} step={5}
              onChange={(e) => setDimOffset(Number(e.target.value))}
            />
          </div>

          <button
            onClick={addDimChain}
            className="w-full py-2 rounded border border-accent-primary/40
                       text-accent-primary text-xs flex items-center justify-center gap-2
                       hover:bg-accent-primary/10 transition-colors font-display font-semibold"
          >
            <BarChart2 size={13} />
            Add Dim Chain
          </button>
        </div>
      )}

      <div className="divider" />

      {/* ── Callout ───────────────────────────────── */}
      <SectionHead
        label="Callout Box"
        open={calloutOpen}
        onToggle={() => setCalloutOpen(!calloutOpen)}
      />
      {calloutOpen && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          <div>
            <p className="text-2xs text-text-muted mb-1">Title</p>
            <input
              className="cad-input w-full"
              value={callTitle}
              onChange={(e) => setCallTitle(e.target.value)}
              placeholder="Note title"
            />
          </div>
          <div>
            <p className="text-2xs text-text-muted mb-1">Body</p>
            <textarea
              className="cad-input w-full resize-none"
              rows={3}
              value={callBody}
              onChange={(e) => setCallBody(e.target.value)}
              placeholder="Note body text..."
            />
          </div>
          <button
            onClick={addCallout}
            className="w-full py-2 rounded border border-panel-border
                       text-text-secondary text-xs flex items-center justify-center gap-2
                       hover:bg-panel-hover transition-colors"
          >
            <MessageSquare size={12} />
            Add Callout
          </button>
        </div>
      )}

      {/* Dim Style info */}
      <div className="mt-auto border-t border-panel-border px-3 py-2">
        <p className="text-2xs text-text-muted font-mono mb-1">DIM STYLES</p>
        {Object.entries(DIM_STYLES).map(([name, style]) => (
          <div key={name} className="flex items-center justify-between mb-0.5">
            <span className="text-2xs text-text-secondary capitalize">{name}</span>
            <span className="text-2xs font-mono text-text-muted">
              {style.textSize}pt / {style.offset}px
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────
function SectionHead({ label, open, onToggle }: {
  label: string; open: boolean; onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2
                 hover:bg-panel-hover transition-colors"
    >
      <span className="section-label px-0 py-0 text-text-muted">{label}</span>
      {open
        ? <ChevronUp   size={11} className="text-text-muted" />
        : <ChevronDown size={11} className="text-text-muted" />}
    </button>
  )
}

function TagBtn({ label, color, onClick }: {
  label: string; color: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-2 rounded border
                 border-panel-border text-2xs text-text-muted
                 hover:bg-panel-hover hover:text-text-primary transition-colors"
    >
      <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
      {label}
    </button>
  )
}
