import { useRef, useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { useProjectSync } from "@/hooks/useProjectSync"
import { useGridSystem } from "@/hooks/useGridSystem"
import GridPanel           from "@/components/panels/GridPanel"
import AnnotationPanel     from '@/components/panels/AnnotationPanel'
import DrawingSetupPanel   from '@/components/panels/DrawingSetupPanel'
import CADToolsPanel        from '@/components/panels/CADToolsPanel'
import SchedulePanel        from '@/components/panels/SchedulePanel'
import QuantityPanel        from '@/components/panels/QuantityPanel'
import BNBCPanel            from '@/components/panels/BNBCPanel'
import ExportPanel          from '@/components/panels/ExportPanel'
import IntegrationPanel     from '@/components/panels/IntegrationPanel'
import { useCADTools }      from '@/hooks/useCADTools'
import { saveDrawing, loadDrawing, autoSaveLocal, extractBIMSummary } from '@/lib/canvasStorage'
import { markDrawingComplete } from '@/lib/hubSync'

import Toolbar          from '@/components/toolbar/Toolbar'
import LayerPanel       from '@/components/panels/LayerPanel'
import PropertiesPanel  from '@/components/panels/PropertiesPanel'
import FloorManager     from '@/components/panels/FloorManager'
import ProjectInfoPanel from '@/components/panels/ProjectInfoPanel'
import DrawingCanvas    from '@/components/canvas/DrawingCanvas'
import LoadingOverlay   from '@/components/ui/LoadingOverlay'
import ToastContainer, { toast } from '@/components/ui/Toast'

import {
  ArrowLeft, PanelLeftOpen, PanelRightOpen,
  Save, Download, Cpu, Info,
  Layers, LayoutList, RefreshCw, CheckCircle, Grid3x3,
  Tag, Wrench, FileText as FileSetup, ListChecks, Hash, ShieldCheck, Share2,
} from 'lucide-react'

type LeftTab = 'layers' | 'floors' | 'info' | 'grid' | 'annotate' | 'setup' | 'cad' | 'schedule' | 'qty' | 'bnbc' | 'export' | 'integrate'

export default function DrawingPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate      = useNavigate()

  const {
    hubProject,
    floors, activeFloorId, setActiveFloor,
    leftPanelOpen,  toggleLeftPanel,
    rightPanelOpen, toggleRightPanel,
  } = useAppStore()

  const { syncState, retry } = useProjectSync(projectId)
  const showOverlay = syncState.status === 'loading' || syncState.status === 'error'

  const [leftTab, setLeftTab] = useState<LeftTab>('layers')
  const canvasRef = useRef<any>(null)

  // Grid system
  const gridHook = useGridSystem(canvasRef.current, projectId ?? "")

  // CAD tools
  const cadHook = useCADTools(canvasRef.current)

  // Auto-save every 2 min
  useEffect(() => {
    if (!projectId || !activeFloorId) return
    const interval = setInterval(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      autoSaveLocal(projectId, activeFloorId, canvas)
    }, 120_000)
    return () => clearInterval(interval)
  }, [projectId, activeFloorId])

  // Load drawing when floor changes
  useEffect(() => {
    if (!projectId || !activeFloorId || syncState.status !== 'success') return
    const canvas = canvasRef.current
    if (!canvas) return
    loadDrawing(projectId, activeFloorId, canvas)
      .then((found) => {
        if (!found) {
          const objects = canvas.getObjects().filter((o: any) => !o.__isGrid)
          objects.forEach((o: any) => canvas.remove(o))
          canvas.renderAll()
        }
      })
      .catch(() => {})
  }, [activeFloorId, projectId, syncState.status])

  const handleSave = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || !projectId || !activeFloorId) return
    try {
      await saveDrawing(projectId, activeFloorId, canvas)
      autoSaveLocal(projectId, activeFloorId, canvas)
      const summary = extractBIMSummary(canvas)
      await markDrawingComplete(projectId, {
        wallCount:   summary.wallCount,
        doorCount:   summary.doorCount,
        windowCount: summary.windowCount,
        columnCount: summary.columnCount,
        floorCount:  floors.length,
      })
      toast.success(`"${activeFloorId}" floor সেভ হয়েছে`)
    } catch {
      toast.error('Save করতে সমস্যা হয়েছে')
    }
  }, [projectId, activeFloorId, floors.length])

  const handleFloorSwitch = useCallback(async (floorId: string) => {
    const canvas = canvasRef.current
    if (canvas && projectId && activeFloorId) {
      autoSaveLocal(projectId, activeFloorId, canvas)
      try { await saveDrawing(projectId, activeFloorId, canvas) } catch {}
    }
    setActiveFloor(floorId)
  }, [projectId, activeFloorId, setActiveFloor])

  const activeFloor = floors.find((f) => f.id === activeFloorId)

  return (
    <div className="w-screen h-screen bg-canvas-bg flex flex-col overflow-hidden">

      {/* Header */}
      <header className="bg-panel-bg border-b border-panel-border flex items-center gap-2 px-2 shrink-0 z-20"
        style={{ height: '44px' }}>

        <button onClick={() => navigate('/projects')} className="toolbar-btn w-8 h-8">
          <ArrowLeft size={15} />
        </button>
        <div className="w-px h-5 bg-panel-border" />
        <Cpu size={15} className="text-accent-primary shrink-0" />

        <div className="min-w-0 flex-1">
          <p className="text-text-primary text-xs font-display font-semibold leading-tight truncate">
            {hubProject?.name ?? 'CivilOS Architectural'}
          </p>
          <p className="text-text-muted text-2xs font-mono leading-tight">
            {activeFloor?.name ?? '—'}
            {activeFloor && ` · +${(activeFloor.level / 1000).toFixed(1)}m`}
          </p>
        </div>

        {/* Floor quick-tabs */}
        <div className="hidden sm:flex items-center gap-1 overflow-x-auto max-w-xs">
          {floors.slice(0, 5).map((floor) => (
            <button key={floor.id} onClick={() => handleFloorSwitch(floor.id)}
              className={`px-2 py-1 rounded text-2xs font-mono whitespace-nowrap transition-all border shrink-0
                ${floor.id === activeFloorId
                  ? 'bg-panel-active text-accent-primary border-accent-primary/30'
                  : 'text-text-muted border-transparent hover:bg-panel-hover hover:text-text-secondary'}`}>
              {floor.name}
            </button>
          ))}
          {floors.length > 5 && (
            <span className="text-2xs text-text-muted font-mono px-1">+{floors.length - 5}</span>
          )}
        </div>

        <div className="w-px h-5 bg-panel-border" />

        {syncState.status === 'success' && (
          <CheckCircle size={12} className="text-accent-success" aria-label="Hub synced" />
        )}
        {syncState.status === 'error' && (
          <button onClick={retry} className="toolbar-btn w-8 h-8">
            <RefreshCw size={13} className="text-accent-error" />
          </button>
        )}

        <button onClick={handleSave} className="toolbar-btn w-8 h-8" title="Save (Ctrl+S)">
          <Save size={14} />
        </button>
        <button
          onClick={() => { if (!leftPanelOpen) toggleLeftPanel(); setLeftTab('export') }}
          className="toolbar-btn w-8 h-8"
          title="Export PDF/PNG/SVG"
        >
          <Download size={14} />
        </button>
        <div className="w-px h-5 bg-panel-border" />
        <button onClick={toggleLeftPanel}
          className={`toolbar-btn w-8 h-8 ${leftPanelOpen ? 'text-accent-primary' : ''}`}>
          <PanelLeftOpen size={14} />
        </button>
        <button onClick={toggleRightPanel}
          className={`toolbar-btn w-8 h-8 ${rightPanelOpen ? 'text-accent-primary' : ''}`}>
          <PanelRightOpen size={14} />
        </button>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden relative">

        {showOverlay && <LoadingOverlay syncState={syncState} onRetry={retry} />}

        <Toolbar />

        {leftPanelOpen && (
          <div className="flex flex-col bg-panel-bg border-r border-panel-border animate-fade-in shrink-0"
            style={{ width: '200px' }}>
            {/* Tabs */}
            <div className="flex border-b border-panel-border shrink-0" style={{ height: "28px" }}>
              <TabBtn active={leftTab === 'layers'} onClick={() => setLeftTab('layers')} title="Layers">
                <Layers size={12} />
              </TabBtn>
              <TabBtn active={leftTab === 'floors'} onClick={() => setLeftTab('floors')} title="Floors">
                <LayoutList size={12} />
              </TabBtn>
              <TabBtn active={leftTab === "info"} onClick={() => setLeftTab("info")} title="Project Info">
              <Info size={12} />
            </TabBtn>
            <TabBtn active={leftTab === "grid"} onClick={() => setLeftTab("grid")} title="Structural Grid">
              <Grid3x3 size={12} />
            </TabBtn>
            <TabBtn active={leftTab === "annotate"} onClick={() => setLeftTab("annotate")} title="Annotations">
              <Tag size={12} />
            </TabBtn>
            <TabBtn active={leftTab === "setup"} onClick={() => setLeftTab("setup")} title="Drawing Setup">
              <FileSetup size={12} />
            </TabBtn>
            <TabBtn active={leftTab === "cad"} onClick={() => setLeftTab("cad")} title="CAD Tools">
              <Wrench size={12} />
            </TabBtn>
            <TabBtn active={leftTab === "schedule"} onClick={() => setLeftTab("schedule")} title="Schedules">
              <ListChecks size={12} />
            </TabBtn>
            <TabBtn active={leftTab === "qty"} onClick={() => setLeftTab("qty")} title="Quantity/BOQ">
              <Hash size={12} />
            </TabBtn>
            <TabBtn active={leftTab === "bnbc"} onClick={() => setLeftTab("bnbc")} title="BNBC Checker">
              <ShieldCheck size={12} />
            </TabBtn>
            <TabBtn active={leftTab === "export"} onClick={() => setLeftTab("export")} title="Export">
              <Download size={12} />
            </TabBtn>
            <TabBtn active={leftTab === "integrate"} onClick={() => setLeftTab("integrate")} title="Integration">
              <Share2 size={12} />
            </TabBtn>
            </div>
            <div className="flex-1 overflow-hidden">
              {leftTab === 'layers' && <LayerPanel />}
              {leftTab === 'floors' && <FloorManager />}
              {leftTab === "info"     && <ProjectInfoPanel />}
              {leftTab === "grid"     && <GridPanel hook={gridHook} />}
              {leftTab === "annotate" && <AnnotationPanel canvas={canvasRef.current} />}
              {leftTab === "setup"    && <DrawingSetupPanel canvas={canvasRef.current} />}
              {leftTab === "cad"      && <CADToolsPanel hook={cadHook} />}
              {leftTab === "schedule" && (
                <SchedulePanel
                  canvas={canvasRef.current}
                  projectId={projectId ?? ''}
                  floorId={activeFloorId ?? 'gf'}
                />
              )}
              {leftTab === "qty" && (
                <QuantityPanel
                  canvas={canvasRef.current}
                  projectId={projectId ?? ''}
                  floorId={activeFloorId ?? 'gf'}
                />
              )}
              {leftTab === "bnbc" && (
                <BNBCPanel
                  canvas={canvasRef.current}
                  projectId={projectId ?? ''}
                />
              )}
              {leftTab === "export" && (
                <ExportPanel
                  canvas={canvasRef.current}
                  projectId={projectId ?? ''}
                />
              )}
              {leftTab === "integrate" && (
                <IntegrationPanel
                  canvas={canvasRef.current}
                  projectId={projectId ?? ''}
                />
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
          <DrawingCanvas projectId={projectId ?? ''} canvasRef={canvasRef} onSave={handleSave} />
        </div>

        {rightPanelOpen && (
          <div className="animate-fade-in shrink-0">
            <PropertiesPanel canvas={canvasRef.current} />
          </div>
        )}
      </div>

      <ToastContainer />
    </div>
  )
}

function TabBtn({ children, active, onClick, title }: {
  children: React.ReactNode; active: boolean; onClick: () => void; title: string
}) {
  return (
    <button onClick={onClick} title={title}
      className={`flex-1 flex items-center justify-center text-xs transition-colors border-b-2
        ${active
          ? 'text-accent-primary border-accent-primary bg-panel-active'
          : 'text-text-muted border-transparent hover:text-text-secondary hover:bg-panel-hover'}`}>
      {children}
    </button>
  )
}
