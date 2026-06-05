import { useAppStore } from '@/store/useAppStore'
import type { ActiveTool } from '@/types'
import {
  MousePointer2, Hand, Minus, Square, Circle,
  Columns, DoorOpen, AppWindow, Grid3x3,
  Ruler, Type, PenLine, Eraser, Layers,
  ChevronRight,
} from 'lucide-react'

interface ToolGroup {
  label: string
  tools: ToolDef[]
}

interface ToolDef {
  id:        ActiveTool
  icon:      React.ReactNode
  label:     string
  shortcut?: string
  color?:    string
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    label: 'Navigate',
    tools: [
      { id: 'select', icon: <MousePointer2 size={17} />, label: 'Select',   shortcut: 'V' },
      { id: 'pan',    icon: <Hand          size={17} />, label: 'Pan',      shortcut: 'H' },
    ],
  },
  {
    label: 'BIM Objects',
    tools: [
      { id: 'wall',   icon: <Minus         size={17} />, label: 'Wall',     shortcut: 'W', color: '#64748B' },
      { id: 'column', icon: <Columns       size={17} />, label: 'Column',   shortcut: 'C', color: '#EF4444' },
      { id: 'door',   icon: <DoorOpen      size={17} />, label: 'Door',     shortcut: 'D', color: '#F59E0B' },
      { id: 'window', icon: <AppWindow     size={17} />, label: 'Window',   shortcut: 'I', color: '#00B4D8' },
      { id: 'room',   icon: <Square        size={17} />, label: 'Room',     shortcut: 'R', color: '#10B981' },
    ],
  },
  {
    label: 'Grid & Dim',
    tools: [
      { id: 'grid',      icon: <Grid3x3 size={17} />, label: 'Grid Line', shortcut: 'G' },
      { id: 'dimension', icon: <Ruler    size={17} />, label: 'Dimension', shortcut: 'M' },
    ],
  },
  {
    label: '2D Draw',
    tools: [
      { id: 'line',      icon: <PenLine  size={17} />, label: 'Line',      shortcut: 'L' },
      { id: 'rectangle', icon: <Square   size={17} />, label: 'Rectangle', shortcut: 'B' },
      { id: 'circle',    icon: <Circle   size={17} />, label: 'Circle'                   },
      { id: 'text',      icon: <Type     size={17} />, label: 'Text',      shortcut: 'T' },
    ],
  },
  {
    label: 'Edit',
    tools: [
      { id: 'eraser', icon: <Eraser size={17} />, label: 'Eraser', shortcut: 'E' },
    ],
  },
]

export default function Toolbar() {
  const { activeTool, setActiveTool, leftPanelOpen, toggleLeftPanel } = useAppStore()

  return (
    <div
      className="flex flex-col bg-panel-bg border-r border-panel-border h-full overflow-y-auto"
      style={{ width: '52px' }}
    >
      {/* Logo / Toggle */}
      <button
        onClick={toggleLeftPanel}
        className="flex items-center justify-center w-full border-b border-panel-border text-accent-primary hover:bg-panel-hover transition-colors"
        style={{ height: '44px' }}
        title="Toggle Layer Panel"
      >
        <Layers size={18} />
      </button>

      {/* Tool Groups */}
      <div className="flex flex-col gap-0.5 py-2 px-1.5">
        {TOOL_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            {/* Group divider label */}
            <div className="text-center mb-1">
              <span
                className="text-2xs font-mono text-text-muted leading-none"
                style={{ fontSize: '8px', letterSpacing: '0.05em' }}
              >
                {group.label.toUpperCase().slice(0, 3)}
              </span>
            </div>

            {group.tools.map((tool) => (
              <ToolButton
                key={tool.id}
                tool={tool}
                active={activeTool === tool.id}
                onClick={() => setActiveTool(tool.id)}
              />
            ))}

            {/* Separator */}
            <div className="divider mx-1 mt-1" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Individual Tool Button ───────────────────────────
interface ToolButtonProps {
  tool:    ToolDef
  active:  boolean
  onClick: () => void
}

function ToolButton({ tool, active, onClick }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
      className={`
        relative w-full flex items-center justify-center
        rounded-lg mb-0.5 transition-all duration-150
        ${active
          ? 'bg-panel-active text-accent-primary'
          : 'text-text-muted hover:text-text-primary hover:bg-panel-hover'
        }
      `}
      style={{ height: '36px' }}
    >
      {/* Active indicator */}
      {active && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r"
          style={{ background: tool.color ?? '#00B4D8' }}
        />
      )}

      {/* Icon — colored when active */}
      <span style={{ color: active ? (tool.color ?? '#00B4D8') : undefined }}>
        {tool.icon}
      </span>

      {/* Shortcut badge */}
      {tool.shortcut && (
        <span
          className="absolute bottom-0.5 right-0.5 text-text-muted font-mono leading-none"
          style={{ fontSize: '7px' }}
        >
          {tool.shortcut}
        </span>
      )}
    </button>
  )
}
