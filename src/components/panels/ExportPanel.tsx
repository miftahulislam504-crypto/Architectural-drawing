import { useState, useCallback } from 'react'
import { fabric } from 'fabric'
import {
  exportToPDF, exportToPNGDownload, exportToSVG,
  DEFAULT_EXPORT_OPTIONS,
  SHEET_DIMS, EXPORT_SCALES, getScaleLabel,
  type ExportOptions,
} from '@/lib/pdfExporter'
import { DEFAULT_TITLE_BLOCK, type TitleBlockData } from '@/lib/titleBlock'
import { useAppStore } from '@/store/useAppStore'
import { toast } from '@/components/ui/Toast'
import {
  FileText, Image, Code,
  Download, Printer, ChevronDown, ChevronUp,
  Settings, Eye, Layers,
} from 'lucide-react'

interface ExportPanelProps {
  canvas:    fabric.Canvas | null
  projectId: string
}

export default function ExportPanel({ canvas, projectId }: ExportPanelProps) {
  const { hubProject, activeFloorId, floors, buildingInfo } = useAppStore()

  const activeFloor = floors.find((f) => f.id === activeFloorId)

  const [options, setOptions] = useState<ExportOptions>({
    ...DEFAULT_EXPORT_OPTIONS,
  })

  const [titleData] = useState<TitleBlockData>({
    ...DEFAULT_TITLE_BLOCK,
    projectName:   hubProject?.name    ?? 'Project Name',
    clientName:    hubProject?.clientName ?? 'Client Name',
    drawingTitle:  activeFloor?.name   ?? 'Floor Plan',
    drawingNumber: 'A-101',
    date:          new Date().toLocaleDateString('en-GB'),
  })

  const [sheetOpen,    setSheetOpen]    = useState(true)
  const [qualOpen,     setQualOpen]     = useState(false)
  const [exporting,    setExporting]    = useState<string | null>(null)

  const update = (key: keyof ExportOptions, val: any) =>
    setOptions((prev) => ({ ...prev, [key]: val }))

  // ── Handlers ──────────────────────────────────────
  const handlePDF = useCallback(async () => {
    if (!canvas) return
    setExporting('pdf')
    try {
      await exportToPDF(
        canvas, options, titleData,
        activeFloor?.name, hubProject?.name
      )
      toast.success('PDF print dialog খুলেছে')
    } catch {
      toast.error('PDF export করতে সমস্যা')
    } finally {
      setExporting(null)
    }
  }, [canvas, options, titleData, activeFloor, hubProject])

  const handlePNG = useCallback(async () => {
    if (!canvas) return
    setExporting('png')
    try {
      await exportToPNGDownload(
        canvas, options,
        hubProject?.name ?? 'project',
        activeFloor?.name ?? 'floor'
      )
      toast.success('PNG download হয়েছে')
    } catch {
      toast.error('PNG export করতে সমস্যা')
    } finally {
      setExporting(null)
    }
  }, [canvas, options, hubProject, activeFloor])

  const handleSVG = useCallback(() => {
    if (!canvas) return
    setExporting('svg')
    try {
      exportToSVG(
        canvas,
        hubProject?.name ?? 'project',
        activeFloor?.name ?? 'floor'
      )
      toast.success('SVG download হয়েছে')
    } catch {
      toast.error('SVG export করতে সমস্যা')
    } finally {
      setExporting(null)
    }
  }, [canvas, hubProject, activeFloor])

  const sheet = SHEET_DIMS[options.sheetSize]
  const isLandscape = options.orientation === 'landscape'
  const previewW = isLandscape ? sheet.w : sheet.h
  const previewH = isLandscape ? sheet.h : sheet.w

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Sheet Preview ──────────────────────────── */}
      <div className="px-3 py-3 border-b border-panel-border">
        <p className="text-2xs text-text-muted mb-2 font-mono">SHEET PREVIEW</p>
        <div className="flex items-center justify-center bg-canvas-bg rounded-lg py-3">
          <div
            className="bg-white border border-panel-border relative"
            style={{
              width:  `${(previewW / 1189) * 160}px`,
              height: `${(previewH / 841)  * 80}px`,
            }}
          >
            {/* Drawing area */}
            <div className="absolute inset-1 border border-dashed border-gray-300
                            flex items-center justify-center">
              <div className="text-center">
                <p style={{ fontSize: '6px', color: '#999' }}>
                  {options.sheetSize} {options.orientation}
                </p>
                <p style={{ fontSize: '5px', color: '#bbb' }}>
                  {previewW}×{previewH}mm
                </p>
              </div>
            </div>
            {/* Title block */}
            {options.includeTitleBlock && (
              <div className="absolute bottom-0 left-0 right-0 border-t border-gray-400"
                style={{ height: '12px', background: '#f8fafc' }}>
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-400" />
                <div className="flex h-full">
                  <div className="flex-1 border-r border-gray-300" />
                  <div className="w-8  border-r border-gray-300" />
                  <div className="w-6" />
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="text-2xs text-text-muted text-center mt-1 font-mono">
          Scale: {options.scale} · {getScaleLabel(options.scale)}
        </p>
      </div>

      {/* ── Sheet Settings ─────────────────────────── */}
      <SectionHead label="Sheet Settings" open={sheetOpen} onToggle={() => setSheetOpen(!sheetOpen)} />
      {sheetOpen && (
        <div className="px-3 pb-3 flex flex-col gap-2.5">

          {/* Sheet size */}
          <div>
            <p className="text-2xs text-text-muted mb-1">Sheet Size</p>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(SHEET_DIMS) as Array<keyof typeof SHEET_DIMS>).map((sz) => (
                <button key={sz} onClick={() => update('sheetSize', sz)}
                  className={`px-2.5 py-1 rounded text-2xs font-mono border transition-colors
                    ${options.sheetSize === sz
                      ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                      : 'border-panel-border text-text-muted hover:text-text-secondary'
                    }`}>
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Orientation */}
          <div>
            <p className="text-2xs text-text-muted mb-1">Orientation</p>
            <div className="flex gap-1">
              {(['landscape', 'portrait'] as const).map((o) => (
                <button key={o} onClick={() => update('orientation', o)}
                  className={`flex-1 py-1.5 rounded text-xs border transition-colors capitalize
                    ${options.orientation === o
                      ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                      : 'border-panel-border text-text-muted hover:text-text-secondary'
                    }`}>
                  {o === 'landscape' ? '⬛ Landscape' : '📄 Portrait'}
                </button>
              ))}
            </div>
          </div>

          {/* Scale */}
          <div>
            <p className="text-2xs text-text-muted mb-1">Drawing Scale</p>
            <select className="cad-input w-full"
              value={options.scale}
              onChange={(e) => update('scale', e.target.value)}>
              {EXPORT_SCALES.map((s) => (
                <option key={s} value={s}>{s} — {getScaleLabel(s)}</option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-1.5">
            <ToggleRow
              label="Include Title Block"
              value={options.includeTitleBlock}
              onChange={(v) => update('includeTitleBlock', v)}
            />
            <ToggleRow
              label="Include Grid Lines"
              value={options.includeGrid}
              onChange={(v) => update('includeGrid', v)}
            />
            <ToggleRow
              label="Include Annotations"
              value={options.includeAnnotations}
              onChange={(v) => update('includeAnnotations', v)}
            />
          </div>
        </div>
      )}

      <div className="divider" />

      {/* ── Quality ────────────────────────────────── */}
      <SectionHead label="Export Quality" open={qualOpen} onToggle={() => setQualOpen(!qualOpen)} />
      {qualOpen && (
        <div className="px-3 pb-3">
          <div className="flex flex-col gap-1">
            {([
              { id: 'draft',    label: 'Draft',    desc: 'Fast, lower res'  },
              { id: 'standard', label: 'Standard', desc: 'Balanced (2x)'    },
              { id: 'high',     label: 'High',     desc: 'Best quality (3x)' },
            ] as const).map((q) => (
              <button key={q.id} onClick={() => update('quality', q.id)}
                className={`w-full text-left px-3 py-2 rounded border transition-colors
                  ${options.quality === q.id
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-panel-border hover:bg-panel-hover'
                  }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-display font-semibold
                    ${options.quality === q.id ? 'text-accent-primary' : 'text-text-primary'}`}>
                    {q.label}
                  </span>
                  {options.quality === q.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                  )}
                </div>
                <span className="text-2xs text-text-muted">{q.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="divider" />

      {/* ── Export Actions ─────────────────────────── */}
      <div className="px-3 py-3 flex flex-col gap-2">
        <p className="text-2xs text-text-muted font-mono">EXPORT FORMAT</p>

        {/* PDF / Print */}
        <ExportBtn
          icon={<Printer size={14} />}
          label="PDF / Print"
          sublabel={`${options.sheetSize} ${options.orientation} · ${options.scale}`}
          color="#00B4D8"
          loading={exporting === 'pdf'}
          onClick={handlePDF}
        />

        {/* PNG */}
        <ExportBtn
          icon={<Image size={14} />}
          label="PNG Image"
          sublabel={`${options.quality} quality`}
          color="#10B981"
          loading={exporting === 'png'}
          onClick={handlePNG}
        />

        {/* SVG */}
        <ExportBtn
          icon={<Code size={14} />}
          label="SVG Vector"
          sublabel="Scalable, editable"
          color="#8B5CF6"
          loading={exporting === 'svg'}
          onClick={handleSVG}
        />

        <p className="text-2xs text-text-muted font-bengali text-center mt-1 leading-relaxed">
          PDF-এ print dialog খুলবে — "Save as PDF" সিলেক্ট করুন
        </p>
      </div>

      {/* ── Floor info ──────────────────────────────── */}
      <div className="px-3 py-2 border-t border-panel-border mt-auto">
        <div className="flex items-center justify-between">
          <span className="text-2xs text-text-muted">Current Floor</span>
          <span className="text-2xs font-mono text-accent-primary">
            {activeFloor?.name ?? '—'}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-2xs text-text-muted">Project</span>
          <span className="text-2xs font-mono text-text-secondary truncate max-w-24">
            {hubProject?.name ?? '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Export Button ────────────────────────────────────
function ExportBtn({ icon, label, sublabel, color, loading, onClick }: {
  icon:     React.ReactNode
  label:    string
  sublabel: string
  color:    string
  loading:  boolean
  onClick:  () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border
                 border-panel-border hover:border-opacity-60 hover:bg-panel-hover
                 transition-all disabled:opacity-60 text-left group"
      style={{ borderColor: loading ? color : undefined }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}20`, color }}>
        {loading
          ? <div className="spinner" style={{ width: 12, height: 12 }} />
          : icon
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-display font-semibold text-text-primary">{label}</p>
        <p className="text-2xs text-text-muted">{sublabel}</p>
      </div>
      <Download size={13} className="text-text-muted group-hover:text-text-primary
                                     transition-colors shrink-0" />
    </button>
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
      {open
        ? <ChevronUp   size={11} className="text-text-muted" />
        : <ChevronDown size={11} className="text-text-muted" />}
    </button>
  )
}

function ToggleRow({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-secondary">{label}</span>
      <button onClick={() => onChange(!value)}
        className={`relative w-8 h-4 rounded-full transition-colors duration-200
          ${value ? 'bg-accent-primary' : 'bg-panel-border'}`}>
        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white
          transition-transform duration-200
          ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}
