import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { Cpu, ArrowLeft, Layers, Grid3x3 } from 'lucide-react'

// Phase 1-এ এখানে Canvas, Toolbar, Panels আসবে
// Phase 0-এ শুধু placeholder দেখাচ্ছি

export default function DrawingPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { hubProject, floors, activeFloorId, setActiveFloor } = useAppStore()

  useEffect(() => {
    if (!hubProject && projectId) {
      // Project not loaded — redirect to select
      navigate('/projects')
    }
  }, [hubProject, projectId, navigate])

  if (!hubProject) return null

  const activeFloor = floors.find((f) => f.id === activeFloorId)

  return (
    <div className="w-screen h-screen bg-canvas-bg flex flex-col overflow-hidden">

      {/* Top Header */}
      <div className="bg-panel-bg border-b border-panel-border flex items-center gap-3 px-3"
        style={{ height: '44px' }}>

        <button
          onClick={() => navigate('/projects')}
          className="toolbar-btn w-8 h-8"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="w-px h-5 bg-panel-border" />

        <Cpu size={16} className="text-accent-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-xs font-display font-semibold truncate leading-tight">
            {hubProject.name}
          </p>
          <p className="text-text-muted text-2xs font-mono leading-tight">
            {activeFloor?.name ?? '—'}
          </p>
        </div>

        {/* Floor tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {floors.map((floor) => (
            <button
              key={floor.id}
              onClick={() => setActiveFloor(floor.id)}
              className={`px-2.5 py-1 rounded text-2xs font-mono whitespace-nowrap transition-all
                ${floor.id === activeFloorId
                  ? 'bg-panel-active text-accent-primary border border-accent-primary/30'
                  : 'text-text-muted hover:text-text-secondary hover:bg-panel-hover'
                }`}
            >
              {floor.name}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas Area Placeholder */}
      <div className="flex-1 relative flex items-center justify-center"
        style={{
          background: '#0D0F12',
          backgroundImage: `
            linear-gradient(rgba(0,180,216,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,180,216,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      >
        {/* Center info — Phase 1-এ Canvas হবে এখানে */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4 text-text-muted">
            <Grid3x3 size={32} className="text-accent-primary/30" />
            <Layers size={32} className="text-accent-primary/30" />
          </div>
          <p className="text-text-secondary text-sm font-display mb-1">
            Canvas Loading...
          </p>
          <p className="text-text-muted text-xs font-bengali">
            Phase 1-এ Fabric.js Canvas এখানে আসবে
          </p>
          <div className="mt-4 px-4 py-2 bg-panel-bg border border-panel-border rounded-lg inline-block">
            <p className="text-2xs font-mono text-accent-primary">
              Project: {hubProject.id}
            </p>
            <p className="text-2xs font-mono text-text-muted">
              Floor: {activeFloor?.name} | Level: {activeFloor?.level}mm
            </p>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <span>X: 0</span>
        <span>Y: 0</span>
        <span className="w-px h-3 bg-panel-border" />
        <span>Zoom: 100%</span>
        <span className="w-px h-3 bg-panel-border" />
        <span className="text-accent-primary">SELECT</span>
        <span className="w-px h-3 bg-panel-border" />
        <span>{hubProject.name}</span>
      </div>
    </div>
  )
}
