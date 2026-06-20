import { useAppStore } from '@/store/useAppStore'
import { Compass, Target, Minus, BarChart2, Circle, Cloud } from 'lucide-react'
import type { SymbolType } from '@/components/canvas/tools/SymbolTool'

interface SymbolsPanelProps {
  onSelectSymbol: (type: SymbolType) => void
  activeSymbol:   SymbolType | null
}

const SYMBOLS: Array<{
  type:  SymbolType
  label: string
  desc:  string
  icon:  React.ReactNode
  color: string
}> = [
  {
    type:  'north_arrow',
    label: 'North Arrow',
    desc:  'North direction marker',
    icon:  <Compass size={18} />,
    color: '#475569',
  },
  {
    type:  'level_marker',
    label: 'Level Marker',
    desc:  'Floor level tag',
    icon:  <Target size={18} />,
    color: '#00B4D8',
  },
  {
    type:  'section_marker',
    label: 'Section Mark',
    desc:  'Section A-A',
    icon:  <Minus size={18} />,
    color: '#EF4444',
  },
  {
    type:  'elevation_marker',
    label: 'Elevation Mark',
    desc:  'Elevation tag',
    icon:  <BarChart2 size={18} />,
    color: '#F59E0B',
  },
  {
    type:  'grid_bubble',
    label: 'Grid Bubble',
    desc:  'Grid reference',
    icon:  <Circle size={18} />,
    color: '#1E6A9A',
  },
  {
    type:  'cloud',
    label: 'Rev. Cloud',
    desc:  'Revision mark',
    icon:  <Cloud size={18} />,
    color: '#F59E0B',
  },
]

export default function SymbolsPanel({ onSelectSymbol, activeSymbol }: SymbolsPanelProps) {
  const { setActiveTool } = useAppStore()

  const handleSelect = (type: SymbolType) => {
    onSelectSymbol(type)
    setActiveTool('select')   // we'll handle via symbol tool separately
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* Header info */}
      <div className="px-3 py-2 border-b border-panel-border">
        <p className="text-2xs text-text-muted leading-relaxed">
          Select a symbol, then click on the canvas
        </p>
      </div>

      {/* Symbol grid */}
      <div className="p-2 grid grid-cols-2 gap-1.5">
        {SYMBOLS.map((sym) => (
          <button
            key={sym.type}
            onClick={() => handleSelect(sym.type)}
            className={`
              flex flex-col items-center gap-1.5 p-3 rounded-lg border
              text-center transition-all duration-150
              ${activeSymbol === sym.type
                ? 'border-accent-primary bg-accent-primary/10'
                : 'border-panel-border hover:border-panel-active hover:bg-panel-hover'
              }
            `}
          >
            <span style={{ color: sym.color }}>{sym.icon}</span>
            <span className="text-2xs font-display font-semibold text-text-primary leading-tight">
              {sym.label}
            </span>
            <span className="text-2xs text-text-muted leading-tight">
              {sym.desc}
            </span>
          </button>
        ))}
      </div>

      {/* Usage hint */}
      <div className="px-3 py-2 mt-auto border-t border-panel-border">
        <p className="text-2xs text-text-muted font-mono">
          Selected: {activeSymbol ?? '—'}
        </p>
        <p className="text-2xs text-text-muted mt-0.5">
          Click canvas to place
        </p>
      </div>
    </div>
  )
}
