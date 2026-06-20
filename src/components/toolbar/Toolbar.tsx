import { useAppStore } from '@/store/useAppStore'
import type { ActiveTool } from '@/types'
import {
  MousePointer2, Hand, Minus, Square, Circle,
  Columns, DoorOpen, AppWindow, Grid3x3,
  Ruler, Type, PenLine, Eraser, Layers,
  Spline, Compass, Move, Edit,
} from 'lucide-react'

interface ToolGroup {
  label: string
  tools: ToolDef[]
}
interface ToolDef {
  id: ActiveTool; icon: React.ReactNode
  label: string; shortcut?: string; color?: string
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    label: 'Navigate',
    tools: [
      { id: 'select', icon: <MousePointer2 size={16} />, label: 'Select',    shortcut: 'V' },
      { id: 'pan',    icon: <Hand          size={16} />, label: 'Pan',       shortcut: 'H' },
    ],
  },
  {
    label: 'BIM',
    tools: [
      { id: 'wall',   icon: <Minus     size={16} />, label: 'Wall',   shortcut: 'W', color: '#64748B' },
      { id: 'column', icon: <Columns   size={16} />, label: 'Column', shortcut: 'C', color: '#EF4444' },
      { id: 'door',   icon: <DoorOpen  size={16} />, label: 'Door',   shortcut: 'D', color: '#F59E0B' },
      { id: 'window', icon: <AppWindow size={16} />, label: 'Window', shortcut: 'I', color: '#00B4D8' },
      { id: 'room',   icon: <Square    size={16} />, label: 'Room',   shortcut: 'R', color: '#10B981' },
    ],
  },
  {
    label: 'Grid',
    tools: [
      { id: 'grid',      icon: <Grid3x3 size={16} />, label: 'Grid Line',  shortcut: 'G' },
      { id: 'dimension', icon: <Ruler   size={16} />, label: 'Dimension',  shortcut: 'M' },
    ],
  },
  {
    label: '2D',
    tools: [
      { id: 'line',      icon: <PenLine  size={16} />, label: 'Line',      shortcut: 'L' },
      { id: 'polyline',  icon: <Spline   size={16} />, label: 'Polyline'               },
      { id: 'rectangle', icon: <Square   size={16} />, label: 'Rectangle', shortcut: 'B' },
      { id: 'circle',    icon: <Circle   size={16} />, label: 'Circle'                 },
      { id: 'text',      icon: <Type     size={16} />, label: 'Text',      shortcut: 'T' },
    ],
  },
  {
    label: 'Edit',
    tools: [
      { id: 'eraser',    icon: <Eraser   size={16} />, label: 'Eraser',    shortcut: 'E' },
    ],
  },
]

export default function Toolbar() {
  const { activeTool, setActiveTool, toggleLeftPanel } = useAppStore()

  return (
    <div className="flex flex-col bg-panel-bg border-r border-panel-border h-full overflow-y-auto shrink-0"
      style={{ width: '48px' }}>

      {/* Logo */}
      <button onClick={toggleLeftPanel}
        className="flex items-center justify-center border-b border-panel-border
                   text-accent-primary hover:bg-panel-hover transition-colors shrink-0"
        style={{ height: '44px' }} title="Toggle Panel">
        <Layers size={17} />
      </button>

      {/* Tools */}
      <div className="flex flex-col gap-0.5 py-1.5 px-1 flex-1">
        {TOOL_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            <div className="text-center mb-0.5">
              <span className="text-text-muted leading-none"
                style={{ fontSize: '7px', letterSpacing: '0.05em' }}>
                {group.label.toUpperCase()}
              </span>
            </div>
            {group.tools.map((tool) => (
              <ToolBtn
                key={tool.id}
                tool={tool}
                active={activeTool === tool.id}
                onClick={() => setActiveTool(tool.id)}
              />
            ))}
            <div className="divider mx-1 mt-1" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ToolBtn({ tool, active, onClick }: {
  tool: ToolDef; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
      className={`relative w-full flex items-center justify-center rounded-lg mb-0.5
        transition-all duration-150 ${active
          ? 'bg-panel-active text-accent-primary'
          : 'text-text-muted hover:text-text-primary hover:bg-panel-hover'
        }`}
      style={{ height: '34px' }}>
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r"
          style={{ background: tool.color ?? '#1a56db' }} />
      )}
      <span style={{ color: active ? (tool.color ?? '#1a56db') : undefined }}>
        {tool.icon}
      </span>
      {tool.shortcut && (
        <span className="absolute bottom-0.5 right-0.5 text-text-muted font-mono leading-none"
          style={{ fontSize: '7px' }}>
          {tool.shortcut}
        </span>
      )}
    </button>
  )
}
