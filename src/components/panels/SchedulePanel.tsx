import { useState, useCallback } from 'react'
import { fabric } from 'fabric'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  extractSchedules,
  exportScheduleCSV,
  exportScheduleJSON,
  getScheduleFirestorePath,
  fmm, typeLabel,
  type FullSchedule,
  type DoorScheduleRow,
  type WindowScheduleRow,
  type RoomScheduleRow,
  type ColumnScheduleRow,
  type WallScheduleRow,
} from '@/lib/scheduleEngine'
import { toast } from '@/components/ui/Toast'
import {
  RefreshCw, Download, Upload,
  DoorOpen, AppWindow, LayoutGrid,
  Columns, Minus, BarChart2,
  Edit2, Check, X,
} from 'lucide-react'

interface SchedulePanelProps {
  canvas:    fabric.Canvas | null
  projectId: string
  floorId:   string
}

type ScheduleTab = 'summary' | 'doors' | 'windows' | 'rooms' | 'columns' | 'walls'

export default function SchedulePanel({
  canvas, projectId, floorId,
}: SchedulePanelProps) {
  const [schedule,   setSchedule]   = useState<FullSchedule | null>(null)
  const [activeTab,  setActiveTab]  = useState<ScheduleTab>('summary')
  const [loading,    setLoading]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [editRemark, setEditRemark] = useState('')

  // ── Extract from canvas ────────────────────────────
  const handleExtract = useCallback(async () => {
    if (!canvas) return
    setLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 100)) // let UI update
      const result = extractSchedules(canvas, floorId)
      setSchedule(result)

      const total =
        result.summary.totalDoors +
        result.summary.totalWindows +
        result.summary.totalRooms +
        result.summary.totalColumns

      toast.success(`Schedule generated from ${total} object(s)`)
      setActiveTab('summary')
    } catch (err) {
      toast.error('Problem extracting schedule')
    } finally {
      setLoading(false)
    }
  }, [canvas, floorId])

  // ── Save to Firestore (read by Estimating App) ───────
  const handleSaveToFirestore = useCallback(async () => {
    if (!schedule || !projectId) return
    setSaving(true)
    try {
      await setDoc(
        doc(db, getScheduleFirestorePath(projectId)),
        {
          ...schedule,
          savedAt:   serverTimestamp(),
          projectId,
          floorId,
        }
      )
      toast.success('Schedule saved to Firestore — Estimating App can now read it ✓')
    } catch {
      toast.error('Problem saving')
    } finally {
      setSaving(false)
    }
  }, [schedule, projectId, floorId])

  // ── Export CSV ─────────────────────────────────────
  const handleExportCSV = useCallback((type: 'doors' | 'windows' | 'rooms' | 'columns' | 'walls') => {
    if (!schedule) return
    const csv  = exportScheduleCSV(schedule, type)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${projectId}-${floorId}-${type}-schedule.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${type} schedule CSV downloaded`)
  }, [schedule, projectId, floorId])

  // ── Export all JSON ────────────────────────────────
  const handleExportJSON = useCallback(() => {
    if (!schedule) return
    const json = exportScheduleJSON(schedule)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${projectId}-${floorId}-schedules.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Full schedule JSON exported')
  }, [schedule, projectId, floorId])

  // ── Edit remark ────────────────────────────────────
  const startEdit  = (id: string, current: string) => {
    setEditingId(id); setEditRemark(current)
  }
  const commitEdit = (rows: any[], setRows: (r: any[]) => void) => {
    setRows(rows.map((r) =>
      r.id === editingId ? { ...r, remarks: editRemark } : r
    ))
    setEditingId(null)
  }

  const TABS: Array<{ id: ScheduleTab; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'summary', label: 'Summary', icon: <BarChart2  size={11} /> },
    { id: 'doors',   label: 'Doors',   icon: <DoorOpen   size={11} />, count: schedule?.summary.totalDoors   },
    { id: 'windows', label: 'Windows', icon: <AppWindow  size={11} />, count: schedule?.summary.totalWindows },
    { id: 'rooms',   label: 'Rooms',   icon: <LayoutGrid size={11} />, count: schedule?.summary.totalRooms   },
    { id: 'columns', label: 'Columns', icon: <Columns    size={11} />, count: schedule?.summary.totalColumns },
    { id: 'walls',   label: 'Walls',   icon: <Minus      size={11} />, count: schedule?.walls.length        },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top actions ───────────────────────────── */}
      <div className="px-2 py-2 border-b border-panel-border flex flex-col gap-1.5 shrink-0">
        <button
          onClick={handleExtract}
          disabled={loading}
          className="w-full py-2 rounded-lg flex items-center justify-center gap-2
                     text-xs font-display font-semibold text-text-inverse transition-all
                     disabled:opacity-60 hover:scale-[1.01] active:scale-[0.99]"
          style={{ background: 'linear-gradient(135deg,#1a56db,#1e429f)' }}
        >
          {loading
            ? <><div className="spinner" style={{ width: 12, height: 12 }} /> Extracting...</>
            : <><RefreshCw size={12} /> Extract Schedules</>
          }
        </button>

        {schedule && (
          <div className="flex gap-1">
            <button
              onClick={handleSaveToFirestore}
              disabled={saving}
              className="flex-1 py-1.5 rounded border border-accent-primary/40
                         text-accent-primary text-2xs flex items-center justify-center gap-1
                         hover:bg-accent-primary/10 transition-colors disabled:opacity-60"
            >
              <Upload size={10} />
              {saving ? 'Saving...' : 'Save to Hub'}
            </button>
            <button
              onClick={handleExportJSON}
              className="flex-1 py-1.5 rounded border border-panel-border
                         text-text-muted text-2xs flex items-center justify-center gap-1
                         hover:bg-panel-hover transition-colors"
            >
              <Download size={10} />
              Export JSON
            </button>
          </div>
        )}
      </div>

      {/* ── Tabs ──────────────────────────────────── */}
      <div className="flex overflow-x-auto border-b border-panel-border shrink-0"
        style={{ minHeight: '28px' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-2 py-1.5 text-2xs whitespace-nowrap
                        border-b-2 transition-colors shrink-0
              ${activeTab === tab.id
                ? 'border-accent-primary text-accent-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-2xs px-1 rounded-full font-mono
                ${activeTab === tab.id ? 'bg-accent-primary/20 text-accent-primary' : 'bg-panel-active text-text-muted'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ───────────────────────────────── */}
      <div className="flex-1 overflow-auto">

        {/* No data yet */}
        {!schedule && (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center py-8">
            <BarChart2 size={28} className="text-text-muted opacity-20 mb-3" />
            <p className="text-xs text-text-muted leading-relaxed">
              Draw BIM objects, then click "Extract Schedules"
            </p>
          </div>
        )}

        {/* Summary Tab */}
        {schedule && activeTab === 'summary' && (
          <SummaryTab schedule={schedule} />
        )}

        {/* Door Schedule */}
        {schedule && activeTab === 'doors' && (
          <DoorScheduleTab
            rows={schedule.doors}
            onExportCSV={() => handleExportCSV('doors')}
            editingId={editingId}
            editRemark={editRemark}
            onStartEdit={startEdit}
            onEditChange={setEditRemark}
            onCommitEdit={(rows) => {
              setSchedule((s) => s ? { ...s, doors: rows } : s)
              setEditingId(null)
            }}
          />
        )}

        {/* Window Schedule */}
        {schedule && activeTab === 'windows' && (
          <WindowScheduleTab
            rows={schedule.windows}
            onExportCSV={() => handleExportCSV('windows')}
            editingId={editingId}
            editRemark={editRemark}
            onStartEdit={startEdit}
            onEditChange={setEditRemark}
            onCommitEdit={(rows) => {
              setSchedule((s) => s ? { ...s, windows: rows } : s)
              setEditingId(null)
            }}
          />
        )}

        {/* Room Schedule */}
        {schedule && activeTab === 'rooms' && (
          <RoomScheduleTab
            rows={schedule.rooms}
            onExportCSV={() => handleExportCSV('rooms')}
            editingId={editingId}
            editRemark={editRemark}
            onStartEdit={startEdit}
            onEditChange={setEditRemark}
            onCommitEdit={(rows) => {
              setSchedule((s) => s ? { ...s, rooms: rows } : s)
              setEditingId(null)
            }}
          />
        )}

        {/* Column Schedule */}
        {schedule && activeTab === 'columns' && (
          <ColumnScheduleTab
            rows={schedule.columns}
            onExportCSV={() => handleExportCSV('columns')}
            editingId={editingId}
            editRemark={editRemark}
            onStartEdit={startEdit}
            onEditChange={setEditRemark}
            onCommitEdit={(rows) => {
              setSchedule((s) => s ? { ...s, columns: rows } : s)
              setEditingId(null)
            }}
          />
        )}

        {/* Wall Schedule */}
        {schedule && activeTab === 'walls' && (
          <WallScheduleTab
            rows={schedule.walls}
            onExportCSV={() => handleExportCSV('walls')}
          />
        )}
      </div>
    </div>
  )
}

// ─── Summary Tab ──────────────────────────────────────
function SummaryTab({ schedule }: { schedule: FullSchedule }) {
  const { summary } = schedule

  const cards = [
    { label: 'Doors',      value: summary.totalDoors,              color: '#F59E0B', icon: <DoorOpen   size={14} /> },
    { label: 'Windows',    value: summary.totalWindows,            color: '#00B4D8', icon: <AppWindow  size={14} /> },
    { label: 'Rooms',      value: summary.totalRooms,              color: '#10B981', icon: <LayoutGrid size={14} /> },
    { label: 'Columns',    value: summary.totalColumns,            color: '#EF4444', icon: <Columns    size={14} /> },
    { label: 'Floor Area', value: `${summary.totalFloorArea} m²`,  color: '#8B5CF6', icon: <BarChart2  size={14} /> },
    { label: 'Wall Area',  value: `${summary.totalWallArea} m²`,   color: '#64748B', icon: <Minus      size={14} /> },
  ]

  return (
    <div className="p-2">
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {cards.map((c) => (
          <div key={c.label}
            className="bg-panel-bg border border-panel-border rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ color: c.color }}>{c.icon}</span>
              <span className="text-2xs text-text-muted">{c.label}</span>
            </div>
            <p className="text-sm font-display font-bold text-text-primary">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-panel-bg border border-panel-border rounded-lg p-3">
        <p className="text-2xs font-mono text-text-muted mb-2">FLOOR SUMMARY</p>
        <div className="flex flex-col gap-1.5">
          {schedule.rooms.map((r) => (
            <div key={r.id} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-success" />
                <span className="text-2xs text-text-secondary">{r.name}</span>
              </div>
              <span className="text-2xs font-mono text-accent-primary">{r.area} m²</span>
            </div>
          ))}
          {schedule.rooms.length === 0 && (
            <p className="text-2xs text-text-muted">No room objects</p>
          )}
        </div>
        {schedule.rooms.length > 0 && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-panel-border">
            <span className="text-2xs font-display font-semibold text-text-primary">Total</span>
            <span className="text-2xs font-mono text-accent-primary font-bold">
              {summary.totalFloorArea} m²
            </span>
          </div>
        )}
      </div>

      <p className="text-2xs text-text-muted font-mono text-center mt-2">
        Floor: {summary.floorId} · {new Date(summary.extractedAt).toLocaleTimeString()}
      </p>
    </div>
  )
}

// ─── Door Schedule Tab ────────────────────────────────
function DoorScheduleTab({ rows, onExportCSV, editingId, editRemark,
  onStartEdit, onEditChange, onCommitEdit }: {
  rows: DoorScheduleRow[]
  onExportCSV: () => void
  editingId: string | null
  editRemark: string
  onStartEdit: (id: string, r: string) => void
  onEditChange: (v: string) => void
  onCommitEdit: (rows: DoorScheduleRow[]) => void
}) {
  const [localRows, setLocalRows] = useState(rows)

  if (localRows.length === 0) {
    return <EmptyState label="Door" />
  }

  return (
    <div className="flex flex-col h-full">
      <ExportBar label="Door Schedule" count={localRows.reduce((s, r) => s + r.quantity, 0)} onExport={onExportCSV} />
      <div className="overflow-auto flex-1">
        <table className="w-full text-2xs">
          <thead className="sticky top-0 bg-panel-bg">
            <tr>
              {['ID', 'Type', 'W×H', 'Mat.', 'Opens', 'Qty', 'Remarks'].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {localRows.map((row) => (
              <tr key={row.id} className="border-b border-panel-border hover:bg-panel-hover">
                <Td accent>{row.id}</Td>
                <Td>{typeLabel(row.type)}</Td>
                <Td mono>{row.width}×{row.height}</Td>
                <Td>{row.material}</Td>
                <Td>{row.openDirection}</Td>
                <Td center bold>{row.quantity}</Td>
                <Td>
                  {editingId === row.id ? (
                    <RemarkEdit
                      value={editRemark}
                      onChange={onEditChange}
                      onCommit={() => { onCommitEdit(localRows); setLocalRows(localRows) }}
                      onCancel={() => onCommitEdit(localRows)}
                    />
                  ) : (
                    <RemarkCell
                      value={row.remarks}
                      onEdit={() => onStartEdit(row.id, row.remarks)}
                    />
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Window Schedule Tab ──────────────────────────────
function WindowScheduleTab({ rows, onExportCSV, editingId, editRemark,
  onStartEdit, onEditChange, onCommitEdit }: {
  rows: WindowScheduleRow[]
  onExportCSV: () => void
  editingId: string | null
  editRemark: string
  onStartEdit: (id: string, r: string) => void
  onEditChange: (v: string) => void
  onCommitEdit: (rows: WindowScheduleRow[]) => void
}) {
  const [localRows] = useState(rows)
  if (localRows.length === 0) return <EmptyState label="Window" />

  return (
    <div className="flex flex-col h-full">
      <ExportBar label="Window Schedule" count={localRows.reduce((s, r) => s + r.quantity, 0)} onExport={onExportCSV} />
      <div className="overflow-auto flex-1">
        <table className="w-full text-2xs">
          <thead className="sticky top-0 bg-panel-bg">
            <tr>
              {['ID', 'Type', 'W×H', 'Sill', 'Mat.', 'Qty', 'Area', 'Remarks'].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {localRows.map((row) => (
              <tr key={row.id} className="border-b border-panel-border hover:bg-panel-hover">
                <Td accent>{row.id}</Td>
                <Td>{typeLabel(row.type)}</Td>
                <Td mono>{row.width}×{row.height}</Td>
                <Td mono>{row.sillLevel}</Td>
                <Td>{row.material}</Td>
                <Td center bold>{row.quantity}</Td>
                <Td mono>{row.area}m²</Td>
                <Td>
                  <RemarkCell value={row.remarks} onEdit={() => onStartEdit(row.id, row.remarks)} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Room Schedule Tab ────────────────────────────────
function RoomScheduleTab({ rows, onExportCSV, editingId, editRemark,
  onStartEdit, onEditChange, onCommitEdit }: {
  rows: RoomScheduleRow[]
  onExportCSV: () => void
  editingId: string | null
  editRemark: string
  onStartEdit: (id: string, r: string) => void
  onEditChange: (v: string) => void
  onCommitEdit: (rows: RoomScheduleRow[]) => void
}) {
  const [localRows] = useState(rows)
  if (localRows.length === 0) return <EmptyState label="Room" />

  const totalArea = localRows.reduce((s, r) => s + r.area, 0)

  return (
    <div className="flex flex-col h-full">
      <ExportBar label="Room Schedule" count={localRows.length} onExport={onExportCSV} />
      <div className="overflow-auto flex-1">
        <table className="w-full text-2xs">
          <thead className="sticky top-0 bg-panel-bg">
            <tr>
              {['No.', 'Room Name', 'Area', 'Floor', 'Wall', 'Occ.', 'Remarks'].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {localRows.map((row) => (
              <tr key={row.id} className="border-b border-panel-border hover:bg-panel-hover">
                <Td accent>{row.number}</Td>
                <Td bold>{row.name}</Td>
                <Td mono accent>{row.area} m²</Td>
                <Td>{row.floorFinish}</Td>
                <Td>{row.wallFinish}</Td>
                <Td center>{row.occupancy}</Td>
                <Td>
                  <RemarkCell value={row.remarks} onEdit={() => onStartEdit(row.id, row.remarks)} />
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-panel-border bg-panel-active">
              <td colSpan={2} className="px-2 py-1.5 text-text-secondary font-display font-semibold">
                Total
              </td>
              <td className="px-2 py-1.5 font-mono text-accent-primary font-bold">
                {totalArea.toFixed(2)} m²
              </td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Column Schedule Tab ──────────────────────────────
function ColumnScheduleTab({ rows, onExportCSV, editingId, editRemark,
  onStartEdit, onEditChange, onCommitEdit }: {
  rows: ColumnScheduleRow[]
  onExportCSV: () => void
  editingId: string | null
  editRemark: string
  onStartEdit: (id: string, r: string) => void
  onEditChange: (v: string) => void
  onCommitEdit: (rows: ColumnScheduleRow[]) => void
}) {
  const [localRows] = useState(rows)
  if (localRows.length === 0) return <EmptyState label="Column" />

  return (
    <div className="flex flex-col h-full">
      <ExportBar label="Column Schedule" count={localRows.reduce((s, r) => s + r.quantity, 0)} onExport={onExportCSV} />
      <div className="overflow-auto flex-1">
        <table className="w-full text-2xs">
          <thead className="sticky top-0 bg-panel-bg">
            <tr>
              {['ID', 'Grid', 'Shape', 'Size', 'Qty', 'Remarks'].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {localRows.map((row) => (
              <tr key={row.id} className="border-b border-panel-border hover:bg-panel-hover">
                <Td accent>{row.id}</Td>
                <Td mono>{row.gridRef || '—'}</Td>
                <Td>{typeLabel(row.shape)}</Td>
                <Td mono>
                  {row.shape === 'circular'
                    ? `Ø${row.diameter}`
                    : `${row.width}×${row.depth}`}
                </Td>
                <Td center bold>{row.quantity}</Td>
                <Td>
                  <RemarkCell value={row.remarks} onEdit={() => onStartEdit(row.id, row.remarks)} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Wall Schedule Tab ────────────────────────────────
function WallScheduleTab({ rows, onExportCSV }: {
  rows: WallScheduleRow[]; onExportCSV: () => void
}) {
  if (rows.length === 0) return <EmptyState label="Wall" />

  return (
    <div className="flex flex-col h-full">
      <ExportBar label="Wall Schedule" count={rows.length} onExport={onExportCSV} />
      <div className="overflow-auto flex-1">
        <table className="w-full text-2xs">
          <thead className="sticky top-0 bg-panel-bg">
            <tr>
              {['Type', 'Thick.', 'Material', 'Length', 'Area', 'Count'].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-panel-border hover:bg-panel-hover">
                <Td bold>{typeLabel(row.type)}</Td>
                <Td mono>{row.thickness}mm</Td>
                <Td>{row.material}</Td>
                <Td mono>{fmm(Math.round(row.totalLength))}</Td>
                <Td mono accent>{row.area.toFixed(1)} m²</Td>
                <Td center bold>{row.count}</Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-panel-border bg-panel-active">
              <td colSpan={4} className="px-2 py-1.5 text-text-secondary font-display font-semibold">
                Total Wall Area
              </td>
              <td className="px-2 py-1.5 font-mono text-accent-primary font-bold">
                {rows.reduce((s, r) => s + r.area, 0).toFixed(2)} m²
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Shared Primitives ────────────────────────────────

function ExportBar({ label, count, onExport }: {
  label: string; count: number; onExport: () => void
}) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 border-b border-panel-border shrink-0">
      <div>
        <span className="text-2xs font-display font-semibold text-text-primary">{label}</span>
        <span className="text-2xs text-text-muted font-mono ml-2">({count} nos)</span>
      </div>
      <button
        onClick={onExport}
        className="flex items-center gap-1 text-2xs text-accent-primary
                   hover:text-accent-primary/80 transition-colors"
      >
        <Download size={10} /> CSV
      </button>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-2 py-1.5 text-2xs font-mono text-text-muted
                   border-b border-panel-border font-normal whitespace-nowrap">
      {children}
    </th>
  )
}

function Td({ children, accent, mono, bold, center }: {
  children: React.ReactNode
  accent?: boolean; mono?: boolean; bold?: boolean; center?: boolean
}) {
  return (
    <td className={`px-2 py-1.5 whitespace-nowrap
      ${accent ? 'text-accent-primary' : 'text-text-secondary'}
      ${mono   ? 'font-mono'           : ''}
      ${bold   ? 'font-semibold'       : ''}
      ${center ? 'text-center'         : ''}
    `}>
      {children}
    </td>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-center px-4">
      <p className="text-xs text-text-muted">
        No {label} objects
      </p>
      <p className="text-2xs text-text-muted mt-1">
        Draw {label} in the drawing, then re-extract
      </p>
    </div>
  )
}

function RemarkCell({ value, onEdit }: { value: string; onEdit: () => void }) {
  return (
    <button
      onClick={onEdit}
      className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors"
    >
      <span className="truncate max-w-16">{value || '—'}</span>
      <Edit2 size={9} className="shrink-0 opacity-0 group-hover:opacity-100" />
    </button>
  )
}

function RemarkEdit({ value, onChange, onCommit, onCancel }: {
  value: string; onChange: (v: string) => void
  onCommit: () => void; onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-0.5">
      <input
        autoFocus
        className="cad-input flex-1 text-2xs py-0.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter')  onCommit()
          if (e.key === 'Escape') onCancel()
        }}
      />
      <button onClick={onCommit}  className="text-accent-success hover:text-accent-success/80">
        <Check size={10} />
      </button>
      <button onClick={onCancel}  className="text-text-muted hover:text-text-primary">
        <X size={10} />
      </button>
    </div>
  )
}
