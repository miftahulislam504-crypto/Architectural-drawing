import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { Floor } from '@/types'
import {
  Plus, Trash2, Edit2, Check, X,
  ChevronUp, ChevronDown, Copy
} from 'lucide-react'

export default function FloorManager() {
  const {
    floors, activeFloorId,
    setActiveFloor, addFloor,
    updateFloor, removeFloor,
  } = useAppStore()

  const [editId,    setEditId]    = useState<string | null>(null)
  const [editName,  setEditName]  = useState('')
  const [editLevel, setEditLevel] = useState('')
  const [showAdd,   setShowAdd]   = useState(false)
  const [newName,   setNewName]   = useState('')

  const sorted = [...floors].sort((a, b) => b.order - a.order)

  // ── Start edit ──────────────────────────────────────
  const startEdit = (floor: Floor) => {
    setEditId(floor.id)
    setEditName(floor.name)
    setEditLevel((floor.level / 1000).toString())
  }

  const commitEdit = () => {
    if (!editId) return
    updateFloor(editId, {
      name:  editName.trim() || 'Unnamed Floor',
      level: parseFloat(editLevel || '0') * 1000,
    })
    setEditId(null)
  }

  // ── Add floor ───────────────────────────────────────
  const addNewFloor = () => {
    if (!newName.trim()) return
    const maxOrder = Math.max(...floors.map((f) => f.order), -1)
    const maxLevel = Math.max(...floors.map((f) => f.level), 0)
    const typical  = floors[0]?.height ?? 3000

    addFloor({
      id:     `f${Date.now()}`,
      name:   newName.trim(),
      level:  maxLevel + typical,
      height: typical,
      order:  maxOrder + 1,
    })
    setNewName('')
    setShowAdd(false)
  }

  // ── Duplicate floor ─────────────────────────────────
  const duplicateFloor = (floor: Floor) => {
    const maxOrder = Math.max(...floors.map((f) => f.order), -1)
    addFloor({
      id:     `f${Date.now()}`,
      name:   `${floor.name} (Copy)`,
      level:  floor.level + floor.height,
      height: floor.height,
      order:  maxOrder + 1,
    })
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-panel-border">
        <span className="text-xs font-display font-semibold text-text-primary">
          Floor Manager
        </span>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="toolbar-btn w-6 h-6"
          title="Add Floor"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Add floor form */}
      {showAdd && (
        <div className="px-3 py-2 bg-panel-hover border-b border-panel-border">
          <p className="text-2xs text-text-muted mb-1.5">New floor name</p>
          <div className="flex gap-1">
            <input
              className="cad-input flex-1"
              placeholder="e.g. 3rd Floor"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNewFloor()}
              autoFocus
            />
            <button
              onClick={addNewFloor}
              className="w-7 h-7 flex items-center justify-center rounded
                         bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30
                         transition-colors"
            >
              <Check size={13} />
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="w-7 h-7 flex items-center justify-center rounded
                         text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Floor list — top = highest level */}
      <div className="flex-1 overflow-y-auto py-1">
        {sorted.map((floor) => (
          <FloorRow
            key={floor.id}
            floor={floor}
            isActive={floor.id === activeFloorId}
            isEditing={editId === floor.id}
            editName={editName}
            editLevel={editLevel}
            canDelete={floors.length > 1}
            onSelect={() => setActiveFloor(floor.id)}
            onEdit={() => startEdit(floor)}
            onCommit={commitEdit}
            onCancel={() => setEditId(null)}
            onDelete={() => removeFloor(floor.id)}
            onDuplicate={() => duplicateFloor(floor)}
            onEditName={setEditName}
            onEditLevel={setEditLevel}
          />
        ))}
      </div>

      {/* Footer info */}
      <div className="border-t border-panel-border px-3 py-2">
        <p className="text-2xs text-text-muted font-mono">
          {floors.length} floor{floors.length !== 1 ? 's' : ''} total
        </p>
      </div>
    </div>
  )
}

// ─── Floor Row ────────────────────────────────────────
interface FloorRowProps {
  floor:       Floor
  isActive:    boolean
  isEditing:   boolean
  editName:    string
  editLevel:   string
  canDelete:   boolean
  onSelect:    () => void
  onEdit:      () => void
  onCommit:    () => void
  onCancel:    () => void
  onDelete:    () => void
  onDuplicate: () => void
  onEditName:  (v: string) => void
  onEditLevel: (v: string) => void
}

function FloorRow({
  floor, isActive, isEditing,
  editName, editLevel, canDelete,
  onSelect, onEdit, onCommit, onCancel,
  onDelete, onDuplicate,
  onEditName, onEditLevel,
}: FloorRowProps) {

  const levelM = (floor.level / 1000).toFixed(1)

  if (isEditing) {
    return (
      <div className="px-2 py-2 bg-panel-active border-l-2 border-accent-primary">
        <input
          className="cad-input w-full mb-1"
          value={editName}
          onChange={(e) => onEditName(e.target.value)}
          placeholder="Floor name"
          autoFocus
        />
        <div className="flex items-center gap-1">
          <span className="text-2xs text-text-muted font-mono w-12 shrink-0">
            Level (m)
          </span>
          <input
            className="cad-input flex-1"
            value={editLevel}
            onChange={(e) => onEditLevel(e.target.value)}
            placeholder="0.0"
            type="number"
            step="0.1"
          />
          <button onClick={onCommit}
            className="w-6 h-6 flex items-center justify-center rounded text-accent-success hover:bg-accent-success/10">
            <Check size={12} />
          </button>
          <button onClick={onCancel}
            className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary">
            <X size={12} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`
        group flex items-center gap-1.5 px-2 py-1.5 cursor-pointer
        transition-colors duration-100 border-l-2
        ${isActive
          ? 'bg-panel-active border-accent-primary'
          : 'border-transparent hover:bg-panel-hover'
        }
      `}
      onClick={onSelect}
    >
      {/* Level indicator */}
      <div className="flex flex-col items-center w-8 shrink-0">
        <ChevronUp size={8} className="text-text-muted opacity-40" />
        <span className="text-2xs font-mono text-text-muted leading-none">
          +{levelM}m
        </span>
        <ChevronDown size={8} className="text-text-muted opacity-40" />
      </div>

      {/* Name */}
      <span className={`flex-1 text-xs truncate font-display
        ${isActive ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
        {floor.name}
      </span>

      {/* Actions — show on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}>

        <ActionBtn onClick={onEdit}    title="Edit">
          <Edit2 size={10} />
        </ActionBtn>
        <ActionBtn onClick={onDuplicate} title="Duplicate">
          <Copy size={10} />
        </ActionBtn>
        {canDelete && (
          <ActionBtn onClick={onDelete} title="Delete" danger>
            <Trash2 size={10} />
          </ActionBtn>
        )}
      </div>
    </div>
  )
}

function ActionBtn({
  children, onClick, title, danger = false
}: {
  children: React.ReactNode
  onClick:  () => void
  title:    string
  danger?:  boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-5 h-5 flex items-center justify-center rounded transition-colors
        ${danger
          ? 'text-accent-error/60 hover:text-accent-error hover:bg-accent-error/10'
          : 'text-text-muted hover:text-text-primary hover:bg-panel-border'
        }`}
    >
      {children}
    </button>
  )
}
