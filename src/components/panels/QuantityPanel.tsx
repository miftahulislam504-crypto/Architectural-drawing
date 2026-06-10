import { useState, useCallback } from 'react'
import { fabric } from 'fabric'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  extractQuantities,
  exportBOQCSV,
  exportBOQJSON,
  getBOQFirestorePath,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  fNum, fBDT,
  type BOQData,
  type QuantityItem,
  type QuantityCategory,
} from '@/lib/quantityEngine'
import { useAppStore } from '@/store/useAppStore'
import { toast } from '@/components/ui/Toast'
import {
  RefreshCw, Download, Upload,
  ChevronDown, ChevronUp,
  BarChart2, Edit2, Check, X,
  ArrowRight, Building2,
} from 'lucide-react'

interface QuantityPanelProps {
  canvas:    fabric.Canvas | null
  projectId: string
  floorId:   string
}

type ViewMode = 'summary' | 'boq' | 'category'

export default function QuantityPanel({
  canvas, projectId, floorId,
}: QuantityPanelProps) {
  const { buildingInfo } = useAppStore()

  const [boq,        setBOQ]        = useState<BOQData | null>(null)
  const [viewMode,   setViewMode]   = useState<ViewMode>('summary')
  const [loading,    setLoading]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [floorH,     setFloorH]     = useState(buildingInfo?.floorHeight ?? 3.0)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editRate,   setEditRate]   = useState('')
  const [selCat,     setSelCat]     = useState<QuantityCategory | 'all'>('all')

  // ── Extract ───────────────────────────────────────
  const handleExtract = useCallback(async () => {
    if (!canvas) return
    setLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 80))
      const result = extractQuantities(canvas, floorId, projectId, floorH)
      setBOQ(result)
      toast.success(`${result.items.length}টি BOQ item তৈরি হয়েছে`)
      setViewMode('summary')
    } catch {
      toast.error('Quantity extract করতে সমস্যা হয়েছে')
    } finally {
      setLoading(false)
    }
  }, [canvas, floorId, projectId, floorH])

  // ── Save to Firestore ─────────────────────────────
  const handleSave = useCallback(async () => {
    if (!boq) return
    setSaving(true)
    try {
      await setDoc(
        doc(db, getBOQFirestorePath(projectId, floorId)),
        {
          ...boq,
          savedAt: serverTimestamp(),
        }
      )
      toast.success('BOQ Firestore-এ save হয়েছে — Estimating App পড়তে পারবে ✓')
    } catch {
      toast.error('Save করতে সমস্যা')
    } finally {
      setSaving(false)
    }
  }, [boq, projectId, floorId])

  // ── Export CSV ────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    if (!boq) return
    const csv  = exportBOQCSV(boq)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${projectId}-${floorId}-boq.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('BOQ CSV download হয়েছে')
  }, [boq, projectId, floorId])

  // ── Export JSON ───────────────────────────────────
  const handleExportJSON = useCallback(() => {
    if (!boq) return
    const json = exportBOQJSON(boq)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${projectId}-${floorId}-boq.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('BOQ JSON export হয়েছে')
  }, [boq, projectId, floorId])

  // ── Update rate ───────────────────────────────────
  const commitRate = useCallback((idx: number) => {
    if (!boq) return
    const rate   = Number(editRate) || 0
    const items  = boq.items.map((item, i) =>
      i === idx
        ? { ...item, rate, amount: Number((rate * item.netQuantity).toFixed(2)) }
        : item
    )
    setBOQ({ ...boq, items })
    setEditingIdx(null)
  }, [boq, editRate])

  // ── Filtered items ────────────────────────────────
  const filteredItems = boq?.items.filter(
    (item) => selCat === 'all' || item.category === selCat
  ) ?? []

  const totalAmount = boq?.items.reduce((s, i) => s + (i.amount ?? 0), 0) ?? 0

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Settings & Extract ────────────────────── */}
      <div className="px-2 py-2 border-b border-panel-border flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <p className="text-2xs text-text-muted mb-0.5">Floor Height (m)</p>
            <input
              type="number"
              className="cad-input w-full"
              value={floorH}
              min={2} max={6} step={0.1}
              onChange={(e) => setFloorH(Number(e.target.value))}
            />
          </div>
          <button
            onClick={handleExtract}
            disabled={loading}
            className="flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5
                       text-xs font-display font-semibold text-text-inverse
                       disabled:opacity-60 transition-all hover:scale-[1.01]"
            style={{ background: 'linear-gradient(135deg,#00B4D8,#0077A8)' }}
          >
            {loading
              ? <><div className="spinner" style={{ width: 11, height: 11 }} /> Wait</>
              : <><RefreshCw size={11} /> Extract</>
            }
          </button>
        </div>

        {boq && (
          <div className="flex gap-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-1.5 rounded border border-accent-primary/40
                         text-accent-primary text-2xs flex items-center justify-center gap-1
                         hover:bg-accent-primary/10 transition-colors disabled:opacity-60">
              <Upload size={9} />
              {saving ? 'Saving...' : 'Save to Hub'}
            </button>
            <button onClick={handleExportCSV}
              className="flex-1 py-1.5 rounded border border-panel-border
                         text-text-muted text-2xs flex items-center justify-center gap-1
                         hover:bg-panel-hover transition-colors">
              <Download size={9} /> CSV
            </button>
            <button onClick={handleExportJSON}
              className="flex-1 py-1.5 rounded border border-panel-border
                         text-text-muted text-2xs flex items-center justify-center gap-1
                         hover:bg-panel-hover transition-colors">
              <Download size={9} /> JSON
            </button>
          </div>
        )}
      </div>

      {/* ── View Mode Tabs ────────────────────────── */}
      {boq && (
        <div className="flex border-b border-panel-border shrink-0">
          {([
            { id: 'summary',  label: 'Summary'  },
            { id: 'boq',      label: 'BOQ Table' },
            { id: 'category', label: 'By Type'  },
          ] as const).map((tab) => (
            <button key={tab.id} onClick={() => setViewMode(tab.id)}
              className={`flex-1 py-1.5 text-2xs border-b-2 transition-colors
                ${viewMode === tab.id
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
                }`}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ───────────────────────────────── */}
      <div className="flex-1 overflow-auto">

        {/* Empty state */}
        {!boq && (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center py-8">
            <Building2 size={28} className="text-text-muted opacity-20 mb-3" />
            <p className="text-xs text-text-muted font-bengali leading-relaxed">
              BIM object আঁকুন তারপর Extract চাপুন।
              Wall, Column, Door, Window, Room থেকে BOQ তৈরি হবে।
            </p>
          </div>
        )}

        {/* Summary View */}
        {boq && viewMode === 'summary' && (
          <SummaryView boq={boq} totalAmount={totalAmount} />
        )}

        {/* BOQ Table */}
        {boq && viewMode === 'boq' && (
          <BOQTableView
            items={boq.items}
            editingIdx={editingIdx}
            editRate={editRate}
            onStartEdit={(idx, rate) => { setEditingIdx(idx); setEditRate(String(rate ?? '')) }}
            onEditRate={setEditRate}
            onCommitRate={commitRate}
            onCancelEdit={() => setEditingIdx(null)}
            totalAmount={totalAmount}
          />
        )}

        {/* Category View */}
        {boq && viewMode === 'category' && (
          <CategoryView
            items={boq.items}
            selCat={selCat}
            onSelCat={setSelCat}
          />
        )}
      </div>
    </div>
  )
}

// ─── Summary View ─────────────────────────────────────
function SummaryView({ boq, totalAmount }: { boq: BOQData; totalAmount: number }) {
  const s = boq.summary

  const metrics = [
    { label: 'Brick Wall',    value: `${s.brickWallVolume} m³`,    sub: `${s.brickWallArea} m² gross`,    color: '#78716C' },
    { label: 'RCC Slab',      value: `${s.slabVolume} m³`,          sub: `${s.slabArea} m² area`,           color: '#EF4444' },
    { label: 'Columns',       value: `${s.columnConcrete} m³`,       sub: `${s.columnCount} nos`,            color: '#EF4444' },
    { label: 'Floor Finish',  value: `${s.floorFinishArea} m²`,      sub: 'Carpet area',                     color: '#8B5CF6' },
    { label: 'Int. Plaster',  value: `${s.internalPlasterArea} m²`,  sub: 'Both wall faces',                 color: '#64748B' },
    { label: 'Doors',         value: `${s.doorCount} nos`,           sub: `${s.totalDoorArea} m² area`,      color: '#F59E0B' },
    { label: 'Windows',       value: `${s.windowCount} nos`,         sub: `${s.totalWindowArea} m² area`,    color: '#00B4D8' },
    { label: 'Built-up Area', value: `${s.builtUpArea.toFixed(1)} m²`, sub: `Carpet: ${s.carpetArea} m²`,   color: '#10B981' },
  ]

  return (
    <div className="p-2">
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {metrics.map((m) => (
          <div key={m.label}
            className="bg-panel-bg border border-panel-border rounded-lg p-2">
            <p className="text-2xs text-text-muted mb-0.5">{m.label}</p>
            <p className="text-xs font-display font-bold" style={{ color: m.color }}>
              {m.value}
            </p>
            <p className="text-2xs text-text-muted font-mono mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* BOQ items count by category */}
      <div className="bg-panel-bg border border-panel-border rounded-lg p-3 mb-2">
        <p className="text-2xs font-mono text-text-muted mb-2">BOQ ITEMS ({boq.items.length})</p>
        {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
          const count = boq.items.filter((i) => i.category === cat).length
          if (count === 0) return null
          return (
            <div key={cat} className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-sm"
                  style={{ background: CATEGORY_COLORS[cat as QuantityCategory] }} />
                <span className="text-2xs text-text-secondary">{label}</span>
              </div>
              <span className="text-2xs font-mono text-text-muted">{count} items</span>
            </div>
          )
        })}
      </div>

      {totalAmount > 0 && (
        <div className="bg-accent-primary/10 border border-accent-primary/30 rounded-lg p-3">
          <p className="text-2xs text-text-muted mb-0.5">Estimated Total</p>
          <p className="text-sm font-display font-bold text-accent-primary">
            {fBDT(totalAmount)}
          </p>
        </div>
      )}

      {/* Estimating App note */}
      <div className="mt-2 p-2 bg-panel-bg border border-panel-border rounded-lg">
        <div className="flex items-center gap-1.5 mb-1">
          <ArrowRight size={11} className="text-accent-primary" />
          <p className="text-2xs font-display font-semibold text-text-primary">
            Estimating App Integration
          </p>
        </div>
        <p className="text-2xs text-text-muted font-bengali leading-relaxed">
          "Save to Hub" করলে Estimating App এই BOQ data পাবে।
          Rate দিলে amount auto calculate হবে।
        </p>
      </div>
    </div>
  )
}

// ─── BOQ Table View ───────────────────────────────────
function BOQTableView({ items, editingIdx, editRate,
  onStartEdit, onEditRate, onCommitRate, onCancelEdit, totalAmount }: {
  items:        QuantityItem[]
  editingIdx:   number | null
  editRate:     string
  onStartEdit:  (idx: number, rate?: number) => void
  onEditRate:   (v: string) => void
  onCommitRate: (idx: number) => void
  onCancelEdit: () => void
  totalAmount:  number
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-1 border-b border-panel-border shrink-0 flex items-center justify-between">
        <span className="text-2xs text-text-muted font-mono">
          {items.length} items
        </span>
        <span className="text-2xs text-text-muted">
          Click Rate column to edit
        </span>
      </div>

      <div className="overflow-auto flex-1">
        <table className="w-full text-2xs min-w-max">
          <thead className="sticky top-0 bg-panel-bg z-10">
            <tr>
              {['#', 'Description', 'Unit', 'Net Qty', 'Rate', 'Amount'].map((h) => (
                <th key={h}
                  className="text-left px-1.5 py-1.5 text-2xs font-mono text-text-muted
                             border-b border-panel-border whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}
                className="border-b border-panel-border hover:bg-panel-hover group">
                <td className="px-1.5 py-1.5 font-mono text-text-muted">
                  {item.slNo}
                </td>
                <td className="px-1.5 py-1.5 max-w-32">
                  <div>
                    <p className="text-text-secondary leading-tight truncate">
                      {item.description}
                    </p>
                    {item.deduction > 0 && (
                      <p className="text-2xs text-accent-error font-mono">
                        Ded: {item.deduction}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-1.5 py-1.5 font-mono text-text-muted whitespace-nowrap">
                  {item.unit}
                </td>
                <td className="px-1.5 py-1.5 font-mono text-accent-primary font-semibold whitespace-nowrap">
                  {item.netQuantity}
                </td>
                <td className="px-1.5 py-1.5">
                  {editingIdx === idx ? (
                    <div className="flex items-center gap-0.5">
                      <input
                        autoFocus
                        type="number"
                        className="cad-input w-16 text-right text-2xs py-0.5"
                        value={editRate}
                        onChange={(e) => onEditRate(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter')  onCommitRate(idx)
                          if (e.key === 'Escape') onCancelEdit()
                        }}
                      />
                      <button onClick={() => onCommitRate(idx)}
                        className="text-accent-success"><Check size={9} /></button>
                      <button onClick={onCancelEdit}
                        className="text-text-muted"><X size={9} /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onStartEdit(idx, item.rate)}
                      className="font-mono text-text-muted hover:text-accent-primary
                                 transition-colors flex items-center gap-0.5"
                    >
                      {item.rate ? fBDT(item.rate) : '— set'}
                      <Edit2 size={8} className="opacity-0 group-hover:opacity-100" />
                    </button>
                  )}
                </td>
                <td className="px-1.5 py-1.5 font-mono text-text-secondary whitespace-nowrap">
                  {item.amount ? fBDT(item.amount) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          {totalAmount > 0 && (
            <tfoot>
              <tr className="border-t-2 border-panel-border bg-panel-active">
                <td colSpan={5}
                  className="px-1.5 py-1.5 font-display font-bold text-text-primary">
                  Grand Total
                </td>
                <td className="px-1.5 py-1.5 font-mono font-bold text-accent-primary">
                  {fBDT(totalAmount)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

// ─── Category View ────────────────────────────────────
function CategoryView({ items, selCat, onSelCat }: {
  items:    QuantityItem[]
  selCat:   QuantityCategory | 'all'
  onSelCat: (c: QuantityCategory | 'all') => void
}) {
  const cats = ['all', ...Object.keys(CATEGORY_LABELS)] as (QuantityCategory | 'all')[]

  const filtered = selCat === 'all'
    ? items
    : items.filter((i) => i.category === selCat)

  return (
    <div className="flex flex-col h-full">
      {/* Category filter */}
      <div className="px-2 py-1.5 border-b border-panel-border flex flex-wrap gap-1 shrink-0">
        {cats.map((cat) => {
          const count = cat === 'all'
            ? items.length
            : items.filter((i) => i.category === cat).length
          if (count === 0 && cat !== 'all') return null
          return (
            <button key={cat} onClick={() => onSelCat(cat)}
              className={`px-2 py-0.5 rounded text-2xs border transition-colors
                ${selCat === cat
                  ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                  : 'border-panel-border text-text-muted hover:text-text-secondary'
                }`}>
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
              <span className="ml-1 font-mono opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-auto">
        {filtered.map((item) => (
          <div key={item.slNo}
            className="px-3 py-2 border-b border-panel-border hover:bg-panel-hover">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div className="w-1.5 h-1.5 rounded-sm shrink-0"
                  style={{ background: CATEGORY_COLORS[item.category] }} />
                <p className="text-2xs text-text-secondary leading-tight">
                  {item.description}
                </p>
              </div>
              <span className="text-2xs font-mono text-text-muted shrink-0">
                {item.slNo}
              </span>
            </div>
            <div className="flex items-center gap-3 pl-3">
              <span className="text-2xs font-mono text-accent-primary font-semibold">
                {item.netQuantity} {item.unit}
              </span>
              {item.deduction > 0 && (
                <span className="text-2xs font-mono text-accent-error">
                  -{item.deduction} deducted
                </span>
              )}
              {item.amount ? (
                <span className="text-2xs font-mono text-text-muted ml-auto">
                  {fBDT(item.amount)}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
