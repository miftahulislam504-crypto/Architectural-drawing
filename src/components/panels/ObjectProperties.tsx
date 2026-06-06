import { useEffect, useState } from 'react'
import { fabric } from 'fabric'
import { getBIMMeta, updateBIMProps } from '@/lib/bimObjects'
import type { WallProps, DoorProps, WindowProps, ColumnProps, RoomProps } from '@/types'
import { Settings2, RefreshCw } from 'lucide-react'

interface ObjectPropertiesProps {
  canvas: fabric.Canvas | null
}

type AnyProps = WallProps | DoorProps | WindowProps | ColumnProps | RoomProps

export default function ObjectProperties({ canvas }: ObjectPropertiesProps) {
  const [selected, setSelected] = useState<{
    type:  string
    id:    string
    props: AnyProps
    obj:   fabric.Object
  } | null>(null)

  // Listen for canvas selection events
  useEffect(() => {
    if (!canvas) return

    const onSelect = (e: any) => {
      const obj = e.selected?.[0] ?? e.target
      if (!obj) return
      const meta = getBIMMeta(obj)
      if (!meta) {
        setSelected(null)
        return
      }
      setSelected({
        type:  meta.__objectType,
        id:    meta.__id,
        props: { ...meta.__props } as AnyProps,
        obj,
      })
    }

    const onClear = () => setSelected(null)

    canvas.on('selection:created',  onSelect)
    canvas.on('selection:updated',  onSelect)
    canvas.on('selection:cleared',  onClear)

    return () => {
      canvas.off('selection:created',  onSelect)
      canvas.off('selection:updated',  onSelect)
      canvas.off('selection:cleared',  onClear)
    }
  }, [canvas])

  if (!selected) {
    return (
      <div className="px-3 py-6 text-center">
        <Settings2 size={20} className="text-text-muted mx-auto mb-2 opacity-30" />
        <p className="text-2xs text-text-muted font-bengali leading-relaxed">
          কোনো object সিলেক্ট করুন
          properties দেখতে
        </p>
      </div>
    )
  }

  const { type, id, props, obj } = selected

  const updateProp = (key: string, value: any) => {
    const updated = { ...props, [key]: value } as AnyProps
    setSelected((s) => s ? { ...s, props: updated } : null)
    updateBIMProps(obj, { [key]: value })
    canvas?.renderAll()
  }

  return (
    <div className="flex flex-col gap-0">

      {/* Object header */}
      <div className="px-3 py-2 border-b border-panel-border">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-2xs font-mono px-1.5 py-0.5 rounded uppercase
            ${TYPE_COLORS[type] ?? 'text-text-muted bg-panel-active'}`}>
            {type}
          </span>
          <span className="text-2xs font-mono text-text-muted">{id}</span>
        </div>
        <p className="text-xs font-display font-semibold text-text-primary">
          {TYPE_LABELS[type] ?? type} Properties
        </p>
      </div>

      {/* Wall Properties */}
      {type === 'wall' && (
        <WallPropsPanel
          props={props as WallProps}
          onChange={updateProp}
        />
      )}

      {/* Column Properties */}
      {type === 'column' && (
        <ColumnPropsPanel
          props={props as ColumnProps}
          onChange={updateProp}
        />
      )}

      {/* Door Properties */}
      {type === 'door' && (
        <DoorPropsPanel
          props={props as DoorProps}
          onChange={updateProp}
        />
      )}

      {/* Window Properties */}
      {type === 'window' && (
        <WindowPropsPanel
          props={props as WindowProps}
          onChange={updateProp}
        />
      )}

      {/* Room Properties */}
      {type === 'room' && (
        <RoomPropsPanel
          props={props as RoomProps}
          onChange={updateProp}
        />
      )}
    </div>
  )
}

// ─── Wall Props ───────────────────────────────────────
function WallPropsPanel({ props, onChange }: { props: WallProps; onChange: F }) {
  return (
    <div className="px-3 py-3 flex flex-col gap-2.5">
      <PropRow label="Type">
        <Select
          value={props.type}
          onChange={(v) => onChange('type', v)}
          options={[
            { value: 'brick',     label: 'Brick Wall' },
            { value: 'rcc',       label: 'RCC Wall' },
            { value: 'partition', label: 'Partition' },
            { value: 'curtain',   label: 'Curtain Wall' },
          ]}
        />
      </PropRow>
      <PropRow label="Thickness">
        <NumInput
          value={props.thickness}
          unit="mm"
          onChange={(v) => onChange('thickness', v)}
          min={100} max={600} step={25}
        />
      </PropRow>
      <PropRow label="Height">
        <NumInput
          value={props.height}
          unit="mm"
          onChange={(v) => onChange('height', v)}
          min={1000} max={6000} step={100}
        />
      </PropRow>
      <PropRow label="Material">
        <TextInput value={props.material} onChange={(v) => onChange('material', v)} />
      </PropRow>
      <PropRow label="Finish">
        <TextInput value={props.finish} onChange={(v) => onChange('finish', v)} />
      </PropRow>
    </div>
  )
}

// ─── Column Props ─────────────────────────────────────
function ColumnPropsPanel({ props, onChange }: { props: ColumnProps; onChange: F }) {
  return (
    <div className="px-3 py-3 flex flex-col gap-2.5">
      <PropRow label="Shape">
        <Select
          value={props.shape}
          onChange={(v) => onChange('shape', v)}
          options={[
            { value: 'square',      label: 'Square' },
            { value: 'rectangular', label: 'Rectangular' },
            { value: 'circular',    label: 'Circular' },
          ]}
        />
      </PropRow>
      {props.shape === 'circular' ? (
        <PropRow label="Diameter">
          <NumInput
            value={props.diameter ?? props.width}
            unit="mm"
            onChange={(v) => onChange('diameter', v)}
            min={150} max={1200} step={50}
          />
        </PropRow>
      ) : (
        <>
          <PropRow label="Width">
            <NumInput
              value={props.width} unit="mm"
              onChange={(v) => onChange('width', v)}
              min={150} max={1200} step={25}
            />
          </PropRow>
          <PropRow label="Depth">
            <NumInput
              value={props.depth} unit="mm"
              onChange={(v) => onChange('depth', v)}
              min={150} max={1200} step={25}
            />
          </PropRow>
        </>
      )}
      <PropRow label="Grid Ref">
        <TextInput
          value={props.gridRef ?? ''}
          onChange={(v) => onChange('gridRef', v)}
          placeholder="e.g. A-1"
        />
      </PropRow>
    </div>
  )
}

// ─── Door Props ───────────────────────────────────────
function DoorPropsPanel({ props, onChange }: { props: DoorProps; onChange: F }) {
  return (
    <div className="px-3 py-3 flex flex-col gap-2.5">
      <PropRow label="Type">
        <Select value={props.type} onChange={(v) => onChange('type', v)}
          options={[
            { value: 'single',  label: 'Single Door' },
            { value: 'double',  label: 'Double Door' },
            { value: 'sliding', label: 'Sliding Door' },
            { value: 'folding', label: 'Folding Door' },
          ]}
        />
      </PropRow>
      <PropRow label="Width">
        <NumInput value={props.width} unit="mm" onChange={(v) => onChange('width', v)}
          min={600} max={2400} step={100} />
      </PropRow>
      <PropRow label="Height">
        <NumInput value={props.height} unit="mm" onChange={(v) => onChange('height', v)}
          min={1800} max={3000} step={100} />
      </PropRow>
      <PropRow label="Opens">
        <Select value={props.openDirection} onChange={(v) => onChange('openDirection', v)}
          options={[
            { value: 'left',  label: 'Left' },
            { value: 'right', label: 'Right' },
          ]}
        />
      </PropRow>
      <PropRow label="Material">
        <TextInput value={props.material} onChange={(v) => onChange('material', v)} />
      </PropRow>
    </div>
  )
}

// ─── Window Props ─────────────────────────────────────
function WindowPropsPanel({ props, onChange }: { props: WindowProps; onChange: F }) {
  return (
    <div className="px-3 py-3 flex flex-col gap-2.5">
      <PropRow label="Type">
        <Select value={props.type} onChange={(v) => onChange('type', v)}
          options={[
            { value: 'casement', label: 'Casement' },
            { value: 'sliding',  label: 'Sliding' },
            { value: 'fixed',    label: 'Fixed' },
            { value: 'awning',   label: 'Awning' },
          ]}
        />
      </PropRow>
      <PropRow label="Width">
        <NumInput value={props.width} unit="mm" onChange={(v) => onChange('width', v)}
          min={300} max={3000} step={100} />
      </PropRow>
      <PropRow label="Height">
        <NumInput value={props.height} unit="mm" onChange={(v) => onChange('height', v)}
          min={300} max={2400} step={100} />
      </PropRow>
      <PropRow label="Sill Level">
        <NumInput value={props.sillLevel} unit="mm" onChange={(v) => onChange('sillLevel', v)}
          min={0} max={1800} step={100} />
      </PropRow>
      <PropRow label="Material">
        <TextInput value={props.material} onChange={(v) => onChange('material', v)} />
      </PropRow>
    </div>
  )
}

// ─── Room Props ───────────────────────────────────────
function RoomPropsPanel({ props, onChange }: { props: RoomProps; onChange: F }) {
  return (
    <div className="px-3 py-3 flex flex-col gap-2.5">
      <PropRow label="Room Name">
        <TextInput value={props.name} onChange={(v) => onChange('name', v)} />
      </PropRow>
      <PropRow label="Room No.">
        <TextInput value={props.number} onChange={(v) => onChange('number', v)} />
      </PropRow>
      <div className="p-2 bg-panel-hover rounded border border-panel-border">
        <p className="text-2xs text-text-muted mb-0.5">Area</p>
        <p className="text-xs font-mono text-accent-primary">{props.area.toFixed(2)} m²</p>
      </div>
      <PropRow label="Floor Finish">
        <TextInput value={props.floorFinish} onChange={(v) => onChange('floorFinish', v)} />
      </PropRow>
      <PropRow label="Wall Finish">
        <TextInput value={props.wallFinish} onChange={(v) => onChange('wallFinish', v)} />
      </PropRow>
      <PropRow label="Ceiling">
        <TextInput value={props.ceilingFinish} onChange={(v) => onChange('ceilingFinish', v)} />
      </PropRow>
      <PropRow label="Occupancy">
        <NumInput value={props.occupancy} unit="persons"
          onChange={(v) => onChange('occupancy', v)} min={1} max={500} step={1} />
      </PropRow>
    </div>
  )
}

// ─── Shared Form Primitives ───────────────────────────
type F = (key: string, value: any) => void

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-2xs text-text-muted mb-1">{label}</p>
      {children}
    </div>
  )
}

function NumInput({ value, unit, onChange, min, max, step }: {
  value: number; unit?: string; onChange: (v: number) => void
  min?: number; max?: number; step?: number
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        className="cad-input flex-1"
        value={value}
        min={min} max={max} step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {unit && <span className="text-2xs text-text-muted font-mono shrink-0">{unit}</span>}
    </div>
  )
}

function TextInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <input
      type="text"
      className="cad-input w-full"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function Select({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      className="cad-input w-full"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// ─── Constants ────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  wall:   'text-text-secondary bg-panel-active',
  column: 'text-accent-error bg-accent-error/10',
  door:   'text-accent-warning bg-accent-warning/10',
  window: 'text-accent-primary bg-accent-primary/10',
  room:   'text-accent-success bg-accent-success/10',
}

const TYPE_LABELS: Record<string, string> = {
  wall:   'Wall',
  column: 'Column',
  door:   'Door',
  window: 'Window',
  room:   'Room',
}
