import { useState, useCallback } from 'react'
import { fabric } from 'fabric'
import {
  generateTitleBlock,
  DEFAULT_TITLE_BLOCK,
  SHEET_SIZES, SCALES,
  type TitleBlockData,
  type SheetSize,
  type DrawingScale,
} from '@/lib/titleBlock'
import { useAppStore } from '@/store/useAppStore'
import { toast } from '@/components/ui/Toast'
import {
  FileText, ChevronDown, ChevronUp,
  RefreshCw, Eye, EyeOff,
} from 'lucide-react'

interface DrawingSetupPanelProps {
  canvas: fabric.Canvas | null
}

export default function DrawingSetupPanel({ canvas }: DrawingSetupPanelProps) {
  const { hubProject, activeFloorId, floors } = useAppStore()

  const activeFloor = floors.find((f) => f.id === activeFloorId)

  const [data, setData] = useState<TitleBlockData>({
    ...DEFAULT_TITLE_BLOCK,
    projectName:   hubProject?.projectName ?? DEFAULT_TITLE_BLOCK.projectName,
    clientName:    hubProject?.clientName ?? DEFAULT_TITLE_BLOCK.clientName,
    drawingTitle:  activeFloor?.name   ?? 'Floor Plan',
    date:          new Date().toLocaleDateString('en-GB'),
  })

  const [showTitleBlock, setShowTitleBlock] = useState(false)
  const [sheetOpen,     setSheetOpen]       = useState(true)
  const [projectOpen,   setProjectOpen]     = useState(true)
  const [drawingOpen,   setDrawingOpen]     = useState(true)
  const [sigOpen,       setSigOpen]         = useState(false)

  const update = (key: keyof TitleBlockData, val: string) => {
    setData((prev) => ({ ...prev, [key]: val }))
  }

  // ── Generate / update title block ─────────────────
  const applyTitleBlock = useCallback(() => {
    if (!canvas) return
    const scale = 0.4   // px per mm — adjust for canvas size
    generateTitleBlock(canvas, data, scale)
    setShowTitleBlock(true)
    toast.success('Title block added')
  }, [canvas, data])

  // ── Toggle title block visibility ─────────────────
  const toggleTitleBlock = useCallback(() => {
    if (!canvas) return
    const tbs = canvas.getObjects().filter((o: any) => o.__isTitleBlock)
    if (tbs.length === 0) {
      applyTitleBlock()
      return
    }
    const next = !showTitleBlock
    tbs.forEach((o) => o.set({ visible: next }))
    canvas.renderAll()
    setShowTitleBlock(next)
    toast.info(next ? 'Title block shown' : 'Title block hidden')
  }, [canvas, showTitleBlock, applyTitleBlock])

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* Header actions */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-panel-border">
        <FileText size={13} className="text-accent-primary" />
        <span className="text-xs font-display font-semibold text-text-primary flex-1">
          Drawing Setup
        </span>
        <button
          onClick={toggleTitleBlock}
          className={`toolbar-btn w-7 h-7 ${showTitleBlock ? 'text-accent-primary' : 'text-text-muted'}`}
          title="Toggle title block"
        >
          {showTitleBlock ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
        <button
          onClick={applyTitleBlock}
          className="toolbar-btn w-7 h-7"
          title="Apply / Refresh title block"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* ── Sheet Settings ────────────────────────── */}
      <SectionHead label="Sheet" open={sheetOpen} onToggle={() => setSheetOpen(!sheetOpen)} />
      {sheetOpen && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          <div>
            <p className="text-2xs text-text-muted mb-1">Sheet Size</p>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(SHEET_SIZES) as SheetSize[]).map((sz) => (
                <button
                  key={sz}
                  onClick={() => update('sheetSize', sz)}
                  className={`px-2.5 py-1 rounded text-2xs font-mono border transition-colors
                    ${data.sheetSize === sz
                      ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                      : 'border-panel-border text-text-muted hover:text-text-secondary'
                    }`}
                >
                  {sz}
                </button>
              ))}
            </div>
            <p className="text-2xs text-text-muted mt-1 font-mono">
              {SHEET_SIZES[data.sheetSize].width} × {SHEET_SIZES[data.sheetSize].height} mm
            </p>
          </div>

          <div>
            <p className="text-2xs text-text-muted mb-1">Drawing Scale</p>
            <select
              className="cad-input w-full"
              value={data.scale}
              onChange={(e) => update('scale', e.target.value as DrawingScale)}
            >
              {SCALES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-2xs text-text-muted mb-1">Sheet No.</p>
              <input className="cad-input w-full" value={data.sheetNumber}
                onChange={(e) => update('sheetNumber', e.target.value)} />
            </div>
            <div>
              <p className="text-2xs text-text-muted mb-1">Total Sheets</p>
              <input className="cad-input w-full" value={data.totalSheets}
                onChange={(e) => update('totalSheets', e.target.value)} />
            </div>
          </div>

          <div>
            <p className="text-2xs text-text-muted mb-1">Revision</p>
            <input className="cad-input w-full" value={data.revision}
              onChange={(e) => update('revision', e.target.value)}
              placeholder="A" />
          </div>
        </div>
      )}

      <div className="divider" />

      {/* ── Project Info ──────────────────────────── */}
      <SectionHead label="Project Info" open={projectOpen} onToggle={() => setProjectOpen(!projectOpen)} />
      {projectOpen && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          {[
            { key: 'projectName',    label: 'Project Name'    },
            { key: 'projectNumber',  label: 'Project No.'     },
            { key: 'projectAddress', label: 'Project Address' },
            { key: 'clientName',     label: 'Client Name'     },
          ].map(({ key, label }) => (
            <div key={key}>
              <p className="text-2xs text-text-muted mb-1">{label}</p>
              <input
                className="cad-input w-full"
                value={data[key as keyof TitleBlockData]}
                onChange={(e) => update(key as keyof TitleBlockData, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="divider" />

      {/* ── Drawing Info ──────────────────────────── */}
      <SectionHead label="Drawing Info" open={drawingOpen} onToggle={() => setDrawingOpen(!drawingOpen)} />
      {drawingOpen && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          {[
            { key: 'drawingTitle',  label: 'Drawing Title'  },
            { key: 'drawingNumber', label: 'Drawing No.'    },
            { key: 'date',          label: 'Date'           },
          ].map(({ key, label }) => (
            <div key={key}>
              <p className="text-2xs text-text-muted mb-1">{label}</p>
              <input
                className="cad-input w-full"
                value={data[key as keyof TitleBlockData]}
                onChange={(e) => update(key as keyof TitleBlockData, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="divider" />

      {/* ── Firm & Signatures ─────────────────────── */}
      <SectionHead label="Firm & Signatures" open={sigOpen} onToggle={() => setSigOpen(!sigOpen)} />
      {sigOpen && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          {[
            { key: 'firmName',    label: 'Firm Name'    },
            { key: 'firmAddress', label: 'Firm Address' },
            { key: 'firmPhone',   label: 'Phone'        },
            { key: 'drawnBy',     label: 'Drawn By'     },
            { key: 'checkedBy',   label: 'Checked By'   },
            { key: 'approvedBy',  label: 'Approved By'  },
          ].map(({ key, label }) => (
            <div key={key}>
              <p className="text-2xs text-text-muted mb-1">{label}</p>
              <input
                className="cad-input w-full"
                value={data[key as keyof TitleBlockData]}
                onChange={(e) => update(key as keyof TitleBlockData, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Apply button */}
      <div className="px-3 py-3 mt-auto border-t border-panel-border">
        <button
          onClick={applyTitleBlock}
          className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2
                     text-xs font-display font-semibold text-text-inverse transition-all
                     hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg,#1a56db,#1e429f)' }}
        >
          <FileText size={13} />
          Apply Title Block
        </button>
        <p className="text-2xs text-text-muted text-center mt-1.5">
          Adds an A1 sheet border and title block to the drawing
        </p>
      </div>
    </div>
  )
}

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
